# OpenGlance Windows Preview

English | [简体中文](windows-portable-guide.zh-CN.md)

OpenGlance for Windows is currently distributed as an unsigned self-installing ZIP. It does not use Microsoft Store, MSI, or MSIX, and it does not require administrator access.

Because the executable is not Authenticode-signed, Windows can show an unknown publisher or SmartScreen warning. Download it only from the official OpenGlance page, verify the published SHA-256, and do not bypass a warning for a file received through another channel.

## Requirements

- Windows 10 or Windows 11;
- Git available through `git --version`;
- a local clone of the Git repository you want to open.

## Install

1. Open `https://gitleaf.mangofuture.com/download#windows`.
2. Download `OpenGlance-<version>-public-win32-x64.zip`.
3. Compare the ZIP's SHA-256 with the checksum published for that release.
4. Fully exit an older OpenGlance, OpenPeek, or Git Leaf process.
5. Extract the whole ZIP. Do not run the executable from the archive preview.
6. Open `OpenGlance-win32-x64` and run `OpenGlance.exe`.
7. OpenGlance copies the complete app into `%LOCALAPPDATA%\OpenGlance\app`, creates the Start Menu shortcut, and relaunches from the fixed location.
8. Choose a local Git repository.

Electron applications require the complete directory. Do not copy only `OpenGlance.exe`.

## Updates

Only Mango Future official builds connect to the official update service. Public builds follow `stable`; company-internal builds follow `internal-stable`. A packaged build trusts its embedded track, so an environment variable cannot move it between the two. A Community Build shows that identity in Settings and does not query or download from the service.

An official Windows build checks for metadata but does not download an update until the user selects Update. The app verifies the ZIP's file size and SHA-256, prepares the next version in a temporary directory, waits for the current process to exit, then atomically switches the fixed install directory. If the new version cannot start and confirm readiness, the installer attempts to restore the previous version.

Updates do not change an existing local `usageAnalyticsEnabled` setting.

When an OpenPeek 2.x or Git Leaf 1.x fixed installation updates to OpenGlance 3.0, the matching
compatibility executable and old updater arguments are accepted once, the app is copied to
`%LOCALAPPDATA%\OpenGlance\app`, and the new executable must confirm startup before the old installation
is retired. If Windows still has the old updater open, cleanup is retried on the next OpenGlance launch.

## Community Build

From a checkout with Node.js 22.13 or newer:

```powershell
npm ci
npm run package:win
```

The resulting package is technically a `source` distribution and is labeled `Community build`. It uses
`OpenGlance Community` as its Windows CompanyName, is unsigned, does not use official updates, and starts
with usage analytics disabled. See [Build from source](build-from-source.md) for the short contributor
workflow.

## Deep links

OpenGlance registers the `openglance://` protocol from its fixed installation:

```powershell
Start-Process 'openglance://open'
Start-Process 'openglance://open?repo=C%3A%5CUsers%5Cexample%5CProjects%5Copenglance-guide-demo&path=README.md'
```

Existing `openpeek://` and `git-leaf://` links remain accepted for 2.x and 1.x compatibility.
OpenGlance generates only `openglance://` links.

`repo` is a URL-encoded local repository path. `path` is a repository-relative Markdown or MDX path. HTTPS share links use a GitHub `owner/repo` identity and do not transmit a recipient's local path or document content. The public HTTPS handoff is hosted by Mango Future; see [Hosted `/open` and `/share` links](hosted-links.md) for the exact metadata.

## Uninstall

Exit OpenGlance, then remove:

- `%LOCALAPPDATA%\OpenGlance`;
- the OpenGlance shortcut under the current user's Start Menu.

User preferences are stored separately under Electron userData. Back them up or remove them according to your own data-retention needs.
The stable 1.x/2.x Profile remains `%APPDATA%\git-leaf`; uninstalling the app does not remove it.

## Reporting problems

For security issues, follow [SECURITY.md](../SECURITY.md). For ordinary bugs, open a GitHub issue and include the OpenGlance version, build identity, Windows version, installation source, and minimal reproduction steps. Do not attach private repository content or personal paths.
