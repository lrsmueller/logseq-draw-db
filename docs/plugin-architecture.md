# Plugin Architecture

This repository uses a minimal Logseq plugin structure with TypeScript and Vite.

## Entry and Boot

- Entry HTML: `index.html`
- Plugin code entry: `src/index.ts`
- Boot pattern: `logseq.ready(main).catch(console.error)`

## Current Runtime Responsibilities

- Detect graph/model compatibility (`src/logseqModelCheck.ts`)
- Initialize localization (`src/translations/l10nSetup.ts`)
- Register settings schema (`src/settings.ts`)

## Build and Run

- `pnpm dev`: start Vite dev server
- `pnpm build`: type-check + Vite build (dev mode)
- `pnpm prod`: production build

## Design Guidance

- Keep plugin initialization explicit and linear.
- Prefer small helper modules over large monolithic logic.
- Reuse existing settings and graph-check patterns before adding new abstractions.
