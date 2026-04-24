# Contributing to Gortex Web

Thank you for considering contributing! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 20+ (22 recommended, matches CI)
- npm 10+
- A running gortex server on `http://localhost:4747` (see
  [zzet/gortex](https://github.com/zzet/gortex) — `gortex serve`)
- Git

### Setup

```bash
git clone https://github.com/gortexhq/web.git
cd web
npm install
cp .env.local.example .env.local   # edit if your server isn't on :4747
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful commands

```bash
npm run dev         # Next.js dev server with HMR
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # production build — CI runs this
make check          # typecheck + lint + build (same as CI)
```

## How to Contribute

### Reporting Bugs

- Open an issue using the bug report template
- Include the gortex server version (`gortex version`) and the web commit/tag
- Paste any errors from the browser devtools console and the `npm run dev`
  terminal

### Suggesting Features

- Open an issue using the feature request template
- Say which data the feature needs — and whether an existing `/v1/*`
  endpoint already exposes it (see `AGENTS.md`)

### Submitting Code

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `make check` locally
5. Commit with a clear message
6. Open a pull request against `main`

## Project Conventions

Read [`AGENTS.md`](AGENTS.md) before changing anything — it is the source of
truth for how pages are wired. In short:

- **Data goes through `lib/hooks.ts`.** Do not `fetch` from a component, do
  not import fixtures. If the data you need isn't served, add the endpoint
  on the gortex side rather than mocking in the frontend.
- **This is modern Next.js** (App Router, `"use client"` only where it
  matters). APIs may differ from what LLM training data assumes — check
  `node_modules/next/dist/docs/` if unsure.
- **Three-fiber is canonical for graph views**; SVG fallbacks are being
  migrated out.

## Code Style

- Follow the existing file layout under `src/`
- Keep components small; push data shaping into hooks
- No unnecessary abstractions — three similar lines is better than a
  premature helper
- Don't add types for `any` shapes you don't yet understand — add them
  when the endpoint's response is stable

## Questions?

Open an issue or start a discussion. We're happy to help.
