# Agent Entrypoint

This is the canonical agent entrypoint for this repository.

## Scope

- Repo: `logseq-plugin-sample-kit-typescript`
- Stack: TypeScript, Vite, `@logseq/libs`
- Runtime: Logseq Desktop plugin iframe

## Instruction Sources

Use this order when answering or generating code:

1. `docs/*.md` in this repository (primary)
2. Existing implementation patterns in `src/*.ts`
3. External Logseq docs only when local docs are missing or unclear

## Agent + Skill Files

- Agent role: `.agents/agents/logseq-plugin-dev.md`
- Skill: `.agents/skills/logseq-api-lookup.md`

## Development Rules

- Keep solutions simple and repo-aligned.
- Prefer existing patterns in `src/index.ts`, `src/settings.ts`, and `src/logseqModelCheck.ts`.
- Check graph compatibility before DB-only APIs.
- For API guidance, cite local docs file paths.

## Runtime Debugging (MCP)

This repo uses Chrome DevTools MCP via VS Code config at `.vscode/mcp.json`.

- Start Logseq with remote debugging enabled (example):
  - `"C:\Users\<you>\AppData\Local\Logseq\Logseq.exe" --remote-debugging-port=9222`
- MCP server connects with `--browser-url=http://127.0.0.1:9222`.
- Use it for plugin iframe console/runtime inspection and UI debugging.
