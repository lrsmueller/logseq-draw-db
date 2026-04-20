# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-04-20

### Added

- Initial release of `logseq-draw-db`.
- `#draw` block integration with inline `Open Excalidraw` action.
- `/draw` slash command to tag the current block and open the drawing editor.
- Excalidraw-based main UI editor window with save, clear, and close controls.
- Block property persistence via `draw_data` using a versioned scene payload.
- Runtime fallback discovery for draw blocks across DB graph contexts.

### Changed

- Plugin metadata standardized to `logseq-draw-db` (package name, Logseq ID, and docs).
