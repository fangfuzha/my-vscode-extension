# Changelog

All notable changes to this project will be documented in this file.

## [0.0.5] - 2026-11-05

### Added

- Selection highlight module: highlight every occurrence of the selected text in the editor and mark it in the minimap / overview ruler.
- Manager panel gained a "Highlight" section with enable switch, colors, matching options and a "Clear highlight" button.
- New command `My Extension: Clear Selection Highlight`.
- Module documentation under `docs/highlight-module.md`.
- The highlight colors are configured with a color picker; the color fields also accept any CSS color typed by hand.

## [0.0.4] - 2026-11-04

### Added

- SVG module: hover previews, gutter icons, framework-aware inline SVG detection and SVGO optimization.
- Manager panel gained an SVG section with preview and optimization settings.
- SVG hover previews now report the intrinsic dimensions (width x height).
- SVGO plugin toggles: remove viewBox, remove width/height, prefix IDs, merge paths, convert shapes to paths, collapse groups.
- Module documentation under `docs/` covering the SVG, MCP (Context7 + DeepWiki) and license modules.

### Changed

- Manager panel groups the SVG settings into "Preview options" and "SVGO optimization options".
- The GitHub sign-in and sign-out buttons are mutually exclusive; only the one matching the current session is shown.

### Fixed

- The SVG section description now resolves in every locale; it previously fell back to English because the translation key was missing.
- Removed runtime localization entries that no longer had a matching call site.

## [0.0.3] - 2026-11-04

### Added

- DeepWiki MCP support with public and Devin-authenticated connection modes.
- Manager panel navigation and bundled Pico.css styling.

### Changed

- Simplified the status bar item to an icon-only control.

## [0.0.2] - 2026-11-04

### Added

- Context7 API token validation, anonymous fallback, and native OAuth authentication mode.
- Context7 authentication controls and API key verification in the manager panel.

### Fixed

- Context7 API key persistence, clearing, and MCP refresh behavior.

## [0.0.1] - 2026-11-04

### Added

- License manager panel with English and Simplified Chinese localization.
- GitHub license catalog and GitHub authentication for higher API limits.
- Support for adding one or multiple license files.
- Automatic author and year detection from the current Git repository.
- Configurable filename, extension, conventional filenames, and Settings Sync support.
- VSIX packaging and GitHub Actions release workflow with OIDC trusted publishing.
