# Changelog

OpenGlance follows Semantic Versioning for its shared app version. Git tags identify source revisions;
official public artifacts, signatures, checksums, and platform availability are authoritative only on
the [OpenGlance download page](https://gitleaf.mangofuture.com/download).

## Unreleased

### Added

- Added an optional, read-only GitHub Issues local index for Agent and maintainer workflows, with an
  explicit repository allowlist, offline SQLite full-text search, Issue-comment details, incremental
  synchronization, live REST budget protection, structured global CLI output, and desktop scope/status controls.

## 3.0.1 — 2026-08-15 (public release)

### Changed

- Prepared the first public OpenGlance release at the globally unique `3.0.1` version after the
  internal `3.0.0` migration release.
- Public packages use the OpenGlance-native application identity while retaining the stable Profile,
  legacy input aliases, and hosted handoff compatibility needed by existing repositories and links.

## 3.0.0 — 2026-08-15 (internal release)

### Changed

- Renamed the short-lived OpenPeek product identity to OpenGlance across the desktop app, packages,
  artifacts, CLI, documentation, repository references, and generated links.
- Raised the shared app version to `3.0.0` because this changes the canonical application and
  operating-system identity surface again.
- New packages use `OpenGlance.app`, `OpenGlance.exe`, the `openglance` command, `openglance://`,
  `OPENGLANCE_*`, and `openglance-build-info.json` as their canonical names.
- Future official public macOS builds use `com.mangofuture.openglance`; Community Builds use
  `org.openglance.community`. Both use `OpenGlance` as the executable name.

### Compatibility

- The Electron Profile remains `git-leaf`, preserving repositories, sessions, preferences, favorites,
  browser state, and analytics consent through both renames.
- The app accepts the `openpeek` and `git-leaf` CLI aliases, `openpeek://` and `git-leaf://` links,
  `OPENPEEK_*` and `GIT_LEAF_*` environment inputs, and both earlier build-info filenames. New output
  always uses OpenGlance.
- Official internal macOS builds retain `com.mangofuture.gitleaf`, the hidden `Git Leaf` executable,
  the existing ShipIt identity, and the `internal-stable` update coordinates so installed internal Apps
  continue upgrading in place.
- A macOS development install reuses an existing `OpenPeek.app` or `Git Leaf.app`. Windows packages on
  the internal track carry bounded `OpenPeek.exe` and `Git Leaf.exe` launch bridges, migrate either old
  fixed installation into `%LOCALAPPDATA%\OpenGlance\app`, and remove the old tree only after the new
  executable confirms startup.
- The `git_leaf.*` analytics schema, hosted domain, update-service `/git-leaf` roots, and stable Profile
  directory remain unchanged. Domain migration is intentionally separate.

OpenGlance 3.0.0 was published on the internal track for the OpenPeek 2.x migration. It was not
published on the public track.

## 2.0.0 — 2026-08-15 (source tag only)

### Changed

- Renamed Git Leaf to OpenPeek in source and raised the shared app version to `2.0.0`.
- Introduced `OpenPeek.app`, `OpenPeek.exe`, `openpeek`, `openpeek://`, `OPENPEEK_*`, and
  `openpeek-build-info.json` as that revision's canonical names.

### Compatibility

- Preserved the `git-leaf` Profile, CLI and protocol aliases, environment fallbacks, official internal
  macOS Bundle ID and hidden executable, update coordinates, and analytics schema.
- The source tag did not have a corresponding GitHub binary release and was not publicly promoted.

## 1.14.0 — 2026-07-27

### Added

- Periodic remote checks, automatic clean-worktree fast-forwarding, and an explicit guarded merge that
  incorporates remote changes while preserving every local edit as uncommitted work.

### Fixed

- Duplicate line numbers on block quotes and incorrect source anchors for selected Preview lines.
- Sync status text wrapping in narrow sidebars.

## 1.13.0 — 2026-07-27

### Added

- English architecture, MDX-lite, analytics, and marketing documentation as the single maintainer-facing
  source.
- A concise build-from-source guide for Community Builds.
- Bilingual disclosure for the metadata sent through Mango Future hosted `/open` and `/share` handoff
  services.
- A bilingual Windows Preview installation and security guide.
- A public example knowledge repository for first-run evaluation.

### Changed

- Community packages now use `org.gitleaf.community` on macOS and `Git Leaf Community` publisher metadata
  on Windows instead of Mango Future's official package identity.
- Non-official packages are labeled `Community build` in the app.
- The Windows release smoke now uses a bounded non-forced health probe and failure-safe cleanup.

### Security

- Updated the development dependency lock to resolve the high-severity `brace-expansion` denial-of-
  service advisory. Production dependencies were not affected.

## 1.12.3 — 2026-07-26

- Removed the privileged macOS update-helper path and enforced direct application-content replacement.
- Added release verification for the signed package, nonprivileged policy, and Profile/ShipIt cleanup.
- Improved sidebar views, Favorites, Sync guidance, keyboard shortcuts, per-tab navigation, tooltips, and
  English/Simplified Chinese UI.
- Compatibility: preserves the existing Git Leaf Profile and repository/workbench state. Official
  public availability remains separate from the source tag.

## 1.11.4 — 2026-07-24

- Strengthened document sharing, remote revision verification, fetch recovery, and navigation behavior.
- Added stronger Windows GitHub Actions evidence and retained-artifact gates to the formal release flow.
- Compatibility: an official internal-track release; no GitHub binary release is attached to the tag.

## 1.11.3 — 2026-07-24

- Introduced the explicit internal release track and the one-time compatibility bridge for earlier
  official installations.
- Compatibility: migration release for official `1.11.2` installations; not a public Community Build.

## Verification and compatibility

- macOS official packages are Developer ID signed and notarized; verify the status and SHA-256 on the
  download page.
- Windows is an unsigned Preview; verify SHA-256 before running it.
- Community Builds are unsigned, do not use official update feeds, and must not be presented as Mango
  Future releases.
- App updates preserve repository configuration and workbench state unless a release note explicitly
  states a migration boundary.
