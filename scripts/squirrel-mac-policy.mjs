#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const SQUIRREL_MAC_POLICY = "nonprivileged-only";
export const SQUIRREL_MAC_POLICY_SCHEMA_VERSION = 1;
export const SQUIRREL_MAC_POLICY_ELECTRON_VERSION = "43.2.0";

const ARCHITECTURE_PATCHES = {
  arm64: {
    before: Buffer.from(
      "00720a581f2003d5c1bd09580201005284180094",
      "hex",
    ),
    after: Buffer.from(
      "00720a581f2003d5c1bd09580200805284180094",
      "hex",
    ),
  },
  x86_64: {
    before: Buffer.from(
      "488b3d69170100488b355afe0000410fb6d4ffd3",
      "hex",
    ),
    after: Buffer.from(
      "488b3d69170100488b355afe000031d29090ffd3",
      "hex",
    ),
  },
};

export function normalizeSquirrelMacArchitectures(value) {
  const architectures = (Array.isArray(value) ? value : String(value || "").trim().split(/\s+/))
    .map((architecture) => String(architecture || "").trim())
    .filter(Boolean);
  if (architectures.length === 0) {
    throw new Error("Squirrel binary does not report a macOS architecture");
  }
  for (const architecture of architectures) {
    if (!ARCHITECTURE_PATCHES[architecture]) {
      throw new Error(`Unsupported Squirrel architecture: ${architecture}`);
    }
  }
  return [...new Set(architectures)];
}

export function squirrelMacSliceExtractionMode(architectures) {
  return normalizeSquirrelMacArchitectures(architectures).length === 1
    ? "copy"
    : "lipo";
}

function countOccurrences(buffer, pattern) {
  let count = 0;
  let offset = 0;
  while (offset <= buffer.length - pattern.length) {
    const match = buffer.indexOf(pattern, offset);
    if (match < 0) break;
    count += 1;
    offset = match + pattern.length;
  }
  return count;
}

export function patchSquirrelArchitectureBuffer(buffer, architecture) {
  const patch = ARCHITECTURE_PATCHES[architecture];
  if (!patch) {
    throw new Error(`Unsupported Squirrel architecture: ${architecture}`);
  }
  const beforeCount = countOccurrences(buffer, patch.before);
  const afterCount = countOccurrences(buffer, patch.after);
  if (beforeCount !== 1 || afterCount !== 0) {
    throw new Error(
      `Squirrel ${architecture} launcher does not match the reviewed Electron ${SQUIRREL_MAC_POLICY_ELECTRON_VERSION} binary`,
    );
  }
  const offset = buffer.indexOf(patch.before);
  const patched = Buffer.from(buffer);
  patch.after.copy(patched, offset);
  return patched;
}

export function verifySquirrelArchitectureBuffer(buffer, architecture) {
  const patch = ARCHITECTURE_PATCHES[architecture];
  if (!patch) {
    throw new Error(`Unsupported Squirrel architecture: ${architecture}`);
  }
  if (
    countOccurrences(buffer, patch.before) !== 0
    || countOccurrences(buffer, patch.after) !== 1
  ) {
    throw new Error(
      `Squirrel ${architecture} is not constrained to the reviewed nonprivileged launcher`,
    );
  }
  return true;
}

function runChecked(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim()
      || result.stdout?.trim()
      || `Command failed: ${command} ${args.join(" ")}`,
    );
  }
  return result.stdout?.trim() || "";
}

function electronVersion(rootDir) {
  return JSON.parse(
    readFileSync(path.join(rootDir, "node_modules", "electron", "package.json"), "utf8"),
  ).version;
}

export function squirrelMacBinaryPath(appDir) {
  return path.join(
    appDir,
    "Contents",
    "Frameworks",
    "Squirrel.framework",
    "Versions",
    "A",
    "Squirrel",
  );
}

export function squirrelMacPolicyMarkerPath(appDir) {
  return path.join(
    appDir,
    "Contents",
    "Resources",
    "git-leaf-squirrel-policy.json",
  );
}

function withThinArchitectures(binaryPath, callback) {
  const temporaryRoot = mkdtempSync(
    path.join(tmpdir(), "git-leaf-squirrel-policy."),
  );
  const architectures = normalizeSquirrelMacArchitectures(
    runChecked("lipo", ["-archs", binaryPath]),
  );
  const extractionMode = squirrelMacSliceExtractionMode(architectures);
  const slices = architectures.map((architecture) => ({
    architecture,
    path: path.join(temporaryRoot, `Squirrel.${architecture}`),
  }));
  try {
    for (const slice of slices) {
      if (extractionMode === "copy") {
        copyFileSync(binaryPath, slice.path);
      } else {
        runChecked("lipo", [
          binaryPath,
          "-thin",
          slice.architecture,
          "-output",
          slice.path,
        ]);
      }
    }
    callback(slices);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

export function patchSquirrelMacPolicy({
  appDir,
  rootDir,
} = {}) {
  if (electronVersion(rootDir) !== SQUIRREL_MAC_POLICY_ELECTRON_VERSION) {
    throw new Error(
      `The Squirrel policy patch is reviewed only for Electron ${SQUIRREL_MAC_POLICY_ELECTRON_VERSION}`,
    );
  }
  const binaryPath = squirrelMacBinaryPath(appDir);
  const binaryMode = statSync(binaryPath).mode;
  withThinArchitectures(binaryPath, (slices) => {
    for (const slice of slices) {
      const patched = patchSquirrelArchitectureBuffer(
        readFileSync(slice.path),
        slice.architecture,
      );
      writeFileSync(slice.path, patched);
    }
    const replacementPath = `${binaryPath}.git-leaf-policy`;
    if (slices.length === 1) {
      copyFileSync(slices[0].path, replacementPath);
    } else {
      runChecked("lipo", [
        "-create",
        ...slices.map((slice) => slice.path),
        "-output",
        replacementPath,
      ]);
    }
    chmodSync(replacementPath, binaryMode);
    renameSync(replacementPath, binaryPath);
  });
  writeFileSync(
    squirrelMacPolicyMarkerPath(appDir),
    `${JSON.stringify({
      schemaVersion: SQUIRREL_MAC_POLICY_SCHEMA_VERSION,
      policy: SQUIRREL_MAC_POLICY,
      electronVersion: SQUIRREL_MAC_POLICY_ELECTRON_VERSION,
      privilegedHelperAllowed: false,
    }, null, 2)}\n`,
    { flag: "wx" },
  );
  return verifySquirrelMacPolicy({ appDir });
}

export function verifySquirrelMacPolicy({ appDir } = {}) {
  const marker = JSON.parse(
    readFileSync(squirrelMacPolicyMarkerPath(appDir), "utf8"),
  );
  if (
    marker.schemaVersion !== SQUIRREL_MAC_POLICY_SCHEMA_VERSION
    || marker.policy !== SQUIRREL_MAC_POLICY
    || marker.electronVersion !== SQUIRREL_MAC_POLICY_ELECTRON_VERSION
    || marker.privilegedHelperAllowed !== false
  ) {
    throw new Error("The packaged Squirrel policy marker is invalid");
  }
  withThinArchitectures(squirrelMacBinaryPath(appDir), (slices) => {
    for (const slice of slices) {
      verifySquirrelArchitectureBuffer(
        readFileSync(slice.path),
        slice.architecture,
      );
    }
  });
  return marker;
}
