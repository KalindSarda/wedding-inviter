---
stage: architecture
generated_by: design-architect-skill
stack:
  backend: cloudflare-workers-typescript-hono-d1
  frontend: preact-vite-typescript
based_on: [.claude-sdlc/outputs/01-requirements.md, .claude-sdlc/outputs/02-feasibility.md]
status: draft
---

# Architecture — Personalised Wedding Invitation Website

## Overview
One Cloudflare Worker serves everything: static frontend assets and a small JSON API, backed by one D1 (SQLite) database. There are two browser apps built by Vite from one repo: the **guest app** (`/i/:code`) and the **admin app** (`/admin`). Events and copy are public content in the repo, not in the database; the database holds only guests, their invited events and RSVPs.

```
Guest phone (WhatsApp link)                 Admin (owner's browser)
        |                                            |
        v                                            v
   GET /i/<code>  ---> static assets          Cloudflare Access (email OTP)
   (guest SPA)                                       |
        |                                            v
        v                                    GET /admin  --> static assets (admin SPA)
 GET /api/guest/:code                                |
 POST /api/guest/:code/rsvp                          v
        |                                    /api/admin/*  (Access JWT verified in Worker)
        +----------------+----------------------------+
                         v
              Worker (Hono): security headers -> rate limit -> routes
                         |
                         v
                       D1: guests, guest_events, rsvp_log
```

Static asset requests are served before the Worker (free, fast). Only `/api/*` runs the Worker (`assets.run_worker_first` for `/api/*`), with the SPA fallback serving `index.html` for `/i/*` and `/admin*`.

## Components & responsibilities

**Repo layout**
```
/config/events.json         public event data (EN/GU) — imported at build by both Worker and frontend
/i18n/en.json, gu.json      all UI copy (shared by guest + admin where relevant)
/migrations/*.sql           D1 migrations (wrangler)
/src/worker/                Worker (Hono)
  index.ts                  app wiring, route mounting, error handler
  middleware/security.ts    CSP and security headers on every response
  middleware/ratelimit.ts   per-IP and per-code limits
  middleware/adminAuth.ts   AuthStrategy: access-jwt (default) | password-cookie (fallback)
  routes/guest.ts           public API
  routes/admin.ts           admin API (guests, import, stats, regenerate-code)
  lib/codes.ts              CSPRNG code generation
  lib/validation.ts         Zod schemas (single source of input rules)
  lib/db.ts                 typed query helpers (parameterised/prepared only)
  lib/events.ts             slug allow-list from events.json
/src/guest/                 guest SPA (Preact): intro, story, countdown, events, RSVP, FAQ, lang toggle
/src/admin/                 admin SPA (Preact): dashboard, list, forms, import, export
/tests/                     vitest (Workers pool) incl. headcount-privacy and admin-auth tests
wrangler.jsonc, vite.config.ts
```

| Component | Does | Does NOT |
|---|---|---|
| Worker / guest routes | Look up guest by code, return allow-listed fields, record RSVP | Return headcount, id, other guests, admin fields; reveal code validity |
| Worker / admin routes | Guest CRUD, CSV import (validated), stats, regenerate code | Trust the UI; accept requests without a verified admin identity |
| adminAuth middleware | Verify Access JWT (signature, `aud`, `iss`, `exp`) on every `/api/admin/*` | Rely on Access alone being in front |
| ratelimit middleware | Throttle public endpoints | Act as the primary defence (unguessable codes are) |
| Guest SPA | Render themed page, i18n, intro, RSVP UI; remember language choice in localStorage | Hold headcount or admin code; load SheetJS/admin bundle |
| Admin SPA | Dashboard, list, forms, WhatsApp/Share/Copy, CSV import UI, Excel export (SheetJS, lazy) | Persist phone numbers; run without API auth |
| `config/events.json` | Single source of event content | Live in D1 |

## Data model
Events: static config; each has `slug`, localized `name`/`venue`/`dressCode`, `startsAt`, `mapUrl`, `order`.

**guests**: `id` INTEGER PK; `code` TEXT UNIQUE NOT NULL (>= 10 chars, uppercase alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ`, 12 chars recommended, via CSPRNG with rejection sampling); `name` TEXT NOT NULL (length-limited); `headcount` INTEGER NOT NULL CHECK >= 1; `default_lang` TEXT NOT NULL CHECK IN ('en','gu'); `rsvp_status` TEXT NULL CHECK IN ('yes','no'); `rsvp_updated_at` TEXT NULL; `created_at`, `updated_at`.
**guest_events**: `guest_id` FK -> guests ON DELETE CASCADE, `event_slug` TEXT; PK (`guest_id`, `event_slug`). Slugs validated against events.json in the Worker (no FK, since events are config).
**rsvp_log**: `id`, `guest_id` FK -> guests ON DELETE CASCADE, `status`, `created_at`. Append-only; deleted with the guest (decision: delete).

Indexes: unique on `guests.code` (the only hot lookup), index on `guest_events.guest_id`, index on `rsvp_log.guest_id`. All hot guest reads are single indexed lookups to stay far under D1 free row-read limits. The admin list loads all guests in one query (up to ~1000 rows); search and filter run client-side. Dashboard stats are computed server-side with one aggregate query so totals always match the list.

Schema leaves room for a future `attending_count` (assumption A1) with no breaking change.

## API boundaries
- **Public (exposed):** `GET /api/guest/:code`, `POST /api/guest/:code/rsvp`. JSON REST. Response is a hand-built allow-list object (`name`, `events[]`, `rsvpStatus`, `defaultLang`), never a spread of the DB row. Not-found and malformed codes return the same generic 404 body and timing-neutral path.
- **Admin (exposed, authenticated):** `GET/POST /api/admin/guests`, `PUT/DELETE /api/admin/guests/:id`, `POST /api/admin/guests/import`, `GET /api/admin/stats`, optional `POST /api/admin/guests/:id/regenerate-code`. Every route is mounted under one router guarded by `adminAuth`; a test enumerates all registered admin routes and asserts 401/403 without a valid token.
- **Static:** `/i/:code` and `/admin*` serve SPA shells. `/admin*` is protected by Access; the shell itself holds no data.
- **Internal-only:** none (single Worker, no service-to-service calls). Full endpoint schemas are for `dev-api-skill`.

## Integration points
- **Cloudflare Access (Zero Trust):** email OTP, JWT in `Cf-Access-Jwt-Assertion`; JWKS fetched from the team domain and cached in memory; `jose` for verification. *Known:* free for up to 50 users. *Unknown/risk:* see below on path scoping.
- **D1:** via Worker binding; migrations through wrangler.
- **WhatsApp (`wa.me`) and Web Share API:** client-side only, no server integration. iOS home-screen behaviour unverified.
- **Google Fonts / fonts:** self-host a subsetted Noto Sans Gujarati (and a display font) to avoid third-party requests and keep CSP tight.
- **SheetJS:** admin-only, lazy-loaded bundle.

## Chosen stack & rationale
### Backend
**Cloudflare Workers + TypeScript + Hono + D1 (final).** Confirms `02-feasibility.md`. Hono for routing/middleware; Zod for boundary validation; `jose` for JWT; vitest with the Workers pool for tests. Single Worker with static assets (Cloudflare's current recommendation for new projects). Not FastAPI/Python: it does not run natively on the mandated free Cloudflare platform.

### Frontend
**Preact + Vite + TypeScript (final).** Two entry points (guest, admin) to keep the guest bundle minimal. CSS animations/transforms for the intro and parallax (no animation library), `prefers-reduced-motion` honoured, images compressed and lazy-loaded, fonts subsetted with `font-display: swap`. i18n via a ~1 KB lookup helper over `en.json`/`gu.json`; a `MusicToggle` extension point exists but is not rendered (off by default, no audio shipped).

## Non-functional design
**Auth model.** Admin identity is verified in the Worker on every admin route. `adminAuth` is a pluggable strategy: (1) `access-jwt` verifies signature, `aud` (Access application AUD tag), issuer and expiry, and checks the email against an allow-list env var; (2) `password-cookie` fallback uses a hashed password secret, HMAC-signed HttpOnly+Secure+SameSite=Strict cookie, and brute-force throttling. Switching needs no change to routes.
**Guest access model.** The code is the credential: 10+ chars, CSPRNG, unambiguous alphabet, no name or sequence element. Regenerate-code supports leaks.
**Input/output safety.** Zod validation on every body/param (name length and charset-safe normalisation, headcount integer range, `status` enum, lang enum, slugs from allow-list); prepared statements only; Preact escapes by default and no `dangerouslySetInnerHTML`; WhatsApp text built with `encodeURIComponent`; Excel/CSV export prefixes cells beginning with `= + - @` to prevent formula injection; CSV import capped in rows and size.
**Headers/CSP.** Set in Worker middleware on all responses: strict CSP (`default-src 'self'`, no inline scripts, self-hosted fonts, `frame-ancestors 'none'`), `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, HSTS, `Permissions-Policy`. Guest pages are `noindex`. Because static assets bypass the Worker by default, headers for assets use the assets `_headers` file where supported, with HTML shells possibly routed through the Worker if needed (risk below).
**Privacy.** No phone numbers stored; Open Graph tags are static and generic (title, description, image) with no name; no names in logs (log route, status and a truncated hash of the code only). Headcount only returned by admin routes; automated test asserts the guest response has exactly the allowed keys.
**Rate limiting.** Per-IP on both public endpoints and per-code on RSVP via the Workers Rate Limiting binding (loose, per-location), with a D1-counter or WAF-rule fallback if the binding is unavailable on the free plan. 429 with `Retry-After`.
**Scaling.** Well inside free tier for 300-1000 invitations (indexed single-row reads, one row write per RSVP plus one log row). No caching layer needed; the static shell is edge-cached.
**Observability.** Workers observability/logs enabled with PII-free structured log lines; a simple count of 4xx/5xx; no third-party analytics.
**Testing hooks.** Headcount-privacy test, per-route admin-auth test, code-format/entropy test, malformed-code generic-404 test, XSS-name rendering test, CSV per-row report test, rate-limit test.

## Open risks
1. **Access scope on workers.dev (important).** The one-click workers.dev Access setting protects the *entire* hostname, which would lock out guests. We need Access scoped only to `/admin*` and `/api/admin*`, and path-level scoping may need a custom domain. Spike this first in phase 1. Outcomes: (a) path-scoped Access works on workers.dev, (b) buy a cheap custom domain (likely small cost, needs owner OK), or (c) use the password-cookie fallback. The auth strategy abstraction keeps this a configuration decision.
2. **Static headers/CSP coverage.** Assets served before the Worker may not receive Worker-set headers; verify the `_headers` file support, or route HTML shells through the Worker.
3. **Rate-limit binding availability/strictness on the free plan** (loose per-location filter); have the fallback ready.
4. **Intro weight on older Android.** Budget total first-load size, keep a skip control and a lighter fallback.
5. **Gujarati font size/rendering.** Subset carefully; test on real devices.
6. **CSV import semantics.** Decide atomic (all-or-nothing) vs apply valid rows with report; default proposal: validate everything first, apply only if zero errors unless the owner prefers partial import.
7. **D1 free-limit enforcement dates** are inconsistently documented; treat limits as enforced and monitor.
8. **iOS home-screen `wa.me`** unverified; Copy and Share remain guaranteed fallbacks.
