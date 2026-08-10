import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSquirrelMacArchitectures,
  patchSquirrelArchitectureBuffer,
  SQUIRREL_MAC_POLICY,
  squirrelMacSliceExtractionMode,
  verifySquirrelArchitectureBuffer,
} from "../scripts/squirrel-mac-policy.mjs";

const FIXTURES = {
  arm64: {
    before: "00720a581f2003d5c1bd09580201005284180094",
    after: "00720a581f2003d5c1bd09580200805284180094",
  },
  x86_64: {
    before: "488b3d69170100488b355afe0000410fb6d4ffd3",
    after: "488b3d69170100488b355afe000031d29090ffd3",
  },
};

test("packaged Squirrel policy is explicitly nonprivileged", () => {
  assert.equal(SQUIRREL_MAC_POLICY, "nonprivileged-only");
});

test("Squirrel policy handles native and universal macOS binaries", () => {
  assert.deepEqual(normalizeSquirrelMacArchitectures("x86_64\n"), ["x86_64"]);
  assert.deepEqual(
    normalizeSquirrelMacArchitectures("x86_64 arm64\n"),
    ["x86_64", "arm64"],
  );
  assert.equal(squirrelMacSliceExtractionMode(["x86_64"]), "copy");
  assert.equal(squirrelMacSliceExtractionMode(["arm64"]), "copy");
  assert.equal(
    squirrelMacSliceExtractionMode(["x86_64", "arm64"]),
    "lipo",
  );
  assert.throws(
    () => normalizeSquirrelMacArchitectures("x86_64 riscv64"),
    /Unsupported Squirrel architecture: riscv64/,
  );
});

for (const [architecture, fixture] of Object.entries(FIXTURES)) {
  test(`Squirrel ${architecture} launcher is patched once and then verified`, () => {
    const original = Buffer.concat([
      Buffer.from("prefix"),
      Buffer.from(fixture.before, "hex"),
      Buffer.from("suffix"),
    ]);
    const patched = patchSquirrelArchitectureBuffer(original, architecture);
    assert.equal(patched.includes(Buffer.from(fixture.before, "hex")), false);
    assert.equal(patched.includes(Buffer.from(fixture.after, "hex")), true);
    assert.equal(
      verifySquirrelArchitectureBuffer(patched, architecture),
      true,
    );
    assert.throws(
      () => patchSquirrelArchitectureBuffer(patched, architecture),
      /does not match the reviewed Electron/,
    );
  });
}

test("Squirrel policy patch fails closed on an unknown binary", () => {
  assert.throws(
    () => patchSquirrelArchitectureBuffer(Buffer.from("unknown"), "arm64"),
    /does not match the reviewed Electron/,
  );
});
