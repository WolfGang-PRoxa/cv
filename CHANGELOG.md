[Français](CHANGELOG.fr.md)

# Changelog

All notable changes to CV Studio are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The version number lives in `package.json` only, and each release is tagged `vX.Y.Z`.

## [Unreleased]

### Added

- MIT license.
- English README (`README.md`), with the French version in `README.fr.md`.
- Changelog in English (`CHANGELOG.md`) and French (`CHANGELOG.fr.md`).
- Prettier and ESLint, run by `npm run check` before the existing checks; `npm run format` and `npm run lint` scripts.
- Unit tests (`npm test`, `node --test`) for shortcut detection, CV release tags and the sync merge.
- GitHub CI running `npm run check` and `npm test` on every push and pull request.

### Changed

- All the code is formatted with Prettier.
- Network errors re-thrown by GitHub publishing and sync keep the original error as their cause.

### Removed

- Unused code in the CV renderer.

## [0.5.0] - 2026-11-09

First version described in this changelog: it sums up what the app does at this point.

### Added

- Reference CV editor: header and three zones (top, main column, side column), blocks moved by drag and drop, block types (timeline section, free box, link card, certification box, banner), generated forms, detail windows, animations, preview at real screen widths in light or dark mode, undo / redo and versioned saves.
- Generated CVs: tree of the base’s elements to hide, notes, live preview, update from a newer base while keeping hidden elements.
- PDF (A4) and standalone HTML exports.
- Publishing a CV as a GitHub release (PDF and HTML page, `cv-<name>-v<n>` tags, never marked “Latest”).
- Sync between computers, chosen in the settings: synced folder (OneDrive, Dropbox…) or secret GitHub Gist encrypted with a password (AES-256-GCM, scrypt), with a three-way merge.
- Desktop and Start menu shortcuts: detection, creation, repair and replacement.
- Window size and position at launch, set in a to-scale frame of the screens.
- Automatic updates from GitHub releases (electron-updater), and a `npm run release` script that publishes and verifies a release.
- Fictional sample CV (Camille Martin) shipped with the app: no personal data ships in the app or the repository.
