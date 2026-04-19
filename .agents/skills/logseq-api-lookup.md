---
name: logseq-api-lookup
description: Answer Logseq plugin API questions with local-doc citations and repo-aligned examples, Use this skill when a task asks how to use Logseq APIs or requests SDK code.
---

# Logseq API Lookup

## Source Order

1. `docs/api-core.md`
2. `docs/db-query.md`
3. `docs/db-properties.md`
4. `docs/experiments-api.md`
5. `docs/plugin-architecture.md`
6. `docs/graph-model-compat.md`
7. Relevant `src/*.ts` patterns

## Required Output

- A short answer.
- A small TypeScript snippet aligned with this repository style.
- A graph-compatibility note when DB APIs are involved.
- At least one local file citation.

## Guardrails

- Do not suggest DB-only APIs without an explicit graph check.
- Prefer stable APIs over experiments unless requested.
- If local docs are insufficient, explicitly mark external fallback usage.
