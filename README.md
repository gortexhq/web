# Gortex Web

The browser UI for [Gortex](https://github.com/zzet/gortex) — a code
intelligence engine that indexes repositories into an in-memory knowledge
graph. This Next.js app talks to a gortex server over HTTP+SSE and renders
the graph, processes, contracts, guards, and investigations.

> Looking for the CLI / MCP server / graph engine? That lives in
> [zzet/gortex](https://github.com/zzet/gortex). This repo is the UI only.

## Quick start

```bash
# 1. Start a gortex server in the repo you want to explore
gortex serve                       # defaults to http://localhost:4747

# 2. In this repo, run the web UI
npm install
cp .env.local.example .env.local   # edit if your server isn't on :4747
npm run dev

# Open http://localhost:3000
```

## Configuration

Configuration is via `.env.local` (see `.env.local.example`):

| Variable                     | Default                   | Purpose                                             |
|------------------------------|---------------------------|-----------------------------------------------------|
| `NEXT_PUBLIC_GORTEX_URL`     | `http://localhost:4747`   | Base URL of the gortex server                       |
| `NEXT_PUBLIC_GORTEX_TOKEN`   | _(unset)_                 | Bearer token — only when the server runs `--auth-token` |

## Scripts

```bash
npm run dev         # dev server on :3000 (HMR)
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
```

Or via `make`:

```bash
make install        # npm install
make dev            # npm run dev
make check          # typecheck + lint + build (same as CI)
make clean          # drop .next and tsbuildinfo
```

## Project layout

```
src/                Next.js App Router pages, components, and lib/hooks
public/             Static assets
.env.local.example  Server URL + optional bearer token
AGENTS.md           Source-of-truth doc for how pages consume data
```

Read [`AGENTS.md`](AGENTS.md) before making changes — it documents the
`lib/hooks.ts` → `/v1/*` contract the UI depends on.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). Security issues: see
[SECURITY.md](SECURITY.md).

## License

See [LICENSE.md](LICENSE.md). Source-available under a PolyForm-based
license; commercial license available for organizations above the
thresholds described in the license.
