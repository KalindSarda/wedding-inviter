# Wedding Inviter

Personalised, bilingual wedding invitation site on Cloudflare (Workers + static assets + D1).
See `.claude-sdlc/outputs/` for requirements, architecture and the API contract.

## Prerequisites
- Node 20+ and npm
- A Cloudflare account (only needed to deploy; local dev needs none)

## Local development
```bash
npm install
npm run db:migrate:local   # applies migrations/ to the local D1 (miniflare) database
npm run dev                # builds the frontend, then runs wrangler dev on http://localhost:8787
```
- Guest page: `http://localhost:8787/i/ANYCODE` (Phase 1 shows a hello page)
- Admin shell: `http://localhost:8787/admin/`
- Health: `http://localhost:8787/api/health`
- `npm run dev:ui` runs Vite alone with HMR and proxies `/api` to the Worker on 8787.

## Scripts
| Command | Does |
|---|---|
| `npm run build` | Vite build of both SPAs into `dist/client` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | vitest in the Workers runtime (applies migrations to a test D1) |
| `npm run deploy` | Build and `wrangler deploy` (needs real D1 id; see below) |

## Deploying (not done yet)
1. `npx wrangler d1 create wedding-invite`, then put the returned `database_id` in `wrangler.jsonc`.
2. `npx wrangler d1 migrations apply wedding-invite --remote`.
3. `npm run deploy`.
4. Configure Cloudflare Access for `/admin*` and `/api/admin*` only (see `docs/access-spike.md`).

## Layout
`config/events.json` public event data, `i18n/` UI copy, `migrations/` D1 schema,
`src/worker/` API, `src/guest/` guest SPA, `src/admin/` admin SPA, `tests/` vitest.
