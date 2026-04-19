# Known Gotchas

## Runtime and API

- DB-only APIs must be guarded by a graph check.
- Experimental APIs in `logseq.Experiments` can break across Logseq versions.

## Repository-specific

- Keep plugin id consistent across code and metadata.
- Keep release packaging filenames aligned with actual file casing.

## Debugging

- Use Chrome DevTools MCP connected to `http://127.0.0.1:9222` to inspect plugin iframe logs.
- Confirm plugin initialization path reaches `logseq.ready(main)` without rejected promises.
