# logseq-draw-db

Logseq drawing plugin for DB graphs with `#draw` block integration and Excalidraw editing.

## Features

1. `#draw` block support
   - Detects draw-tagged blocks and injects an inline `Open Excalidraw` action.
2. `/draw` slash command
   - Adds `#draw` to the current block (if missing) and opens the editor.
3. Excalidraw editor window
   - Opens in plugin main UI with save/clear/close controls.
4. Block property persistence
   - Stores scene data in `draw_data` using a versioned payload envelope.

## Development

1. Install dependencies:
   - `npm install`
2. Build:
   - `npm run build`
3. Load in Logseq developer mode:
   - Select this folder, then reload plugin after code changes.

## Usage

1. Add `#draw` to any block.
2. Click `Open Excalidraw` under that block.
3. Draw and close/save.
4. Scene is persisted to block property `draw_data`.

Or:
1. Use slash command `/draw` in a block.
2. The plugin adds `#draw` (if needed) and opens Excalidraw.

## References

- https://plugins-doc.logseq.com/
- https://github.com/logseq/logseq-plugin-samples
