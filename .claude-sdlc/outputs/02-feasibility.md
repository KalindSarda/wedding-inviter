---
stage: feasibility
generated_by: feasibility-decision-skill
stack:
  backend: cloudflare-workers-typescript (Hono, D1)
  frontend: preact-vite (preliminary)
based_on: [.claude-sdlc/outputs/01-requirements.md]
status: draft
---

# Feasibility & Stack Decision — Personalised Wedding Invitation Website

## Verdict
**Go, with small caveats.** Nothing here is technically hard or unproven. The whole system is a small CRUD app (guests, events, one RSVP flag) on a platform that fits it: Cloudflare Workers plus D1 plus static assets. The only real unknowns are platform details to confirm hands-on in the dashboard (Access on a workers.dev hostname, rate-limit behaviour on the free plan) and the cinematic frontend polish, which is effort rather than risk. The default Python/FastAPI stack is deliberately not used: the owner mandated Cloudflare free hosting with D1, and FastAPI doesn't run natively on Workers.

## Feasibility by area

| Area | Verdict | Reasoning |
|---|---|---|
| Guest page (intro, story, countdown, events, FAQ, i18n) | Feasible with caveats | Straightforward static content. Caveat: poster-then-envelope intro plus parallax must stay light on mid-range phones; build it with CSS/SVG transforms, no video or heavy libraries, and cap total first-load weight. Gujarati rendering needs real-device testing. |
| Guest API (read, RSVP) | Feasible | Two endpoints on D1 with indexed lookup by unique code. Strict allow-list response shape makes the headcount-privacy test easy. |
| Admin auth (Cloudflare Access + JWT verify) | Feasible, needs one hands-on check | Docs show Access one-time PIN for approved emails, Access can be enabled for workers.dev in one click (Oct 2025 changelog), and Zero Trust Free covers up to 50 users. I did not find an explicit statement that OTP login works on a workers.dev hostname, so confirm in the dashboard early. Reports also say Zero Trust signup asks for payment details even on the free plan; owner should expect this. Worker-side JWT verification (signature via the team JWKS, audience, expiry) is standard. Fallback (password + signed cookie) remains available. |
| Admin CRUD, dashboard, search/filter | Feasible | Few hundred to ~1000 rows; filter and search can run client-side or in simple SQL. |
| CSV import with per-row report | Feasible | Parse and validate in the Worker or browser; apply in one D1 batch (all valid rows or an explicit report). Decide atomic vs best-effort in design. |
| Excel export | Feasible | SheetJS in the browser from the admin API. Lazy-load it so it doesn't weigh down the guest page. |
| WhatsApp / Share / Copy | Feasible with caveat | `wa.me` and Web Share are simple. iOS home-screen behaviour is unverified, so test on the owner's phone; Copy stays the guaranteed fallback. |
| Rate limiting (per IP and per code) | Feasible with caveats | The Workers Rate Limiting binding is GA, but limits are per Cloudflare location, periods are only 10 or 60 seconds, and it is a loose filter, not strict. Good enough here because codes are unguessable. I could not confirm free-plan availability from search results, so check docs at build time. Fallback: a Cloudflare WAF rate rule, or a small D1 counter. |
| Scale (300-1000 invitations) | Feasible | Well inside free limits (see below). |
| Security headers / CSP / OG | Feasible | Set headers in the Worker. OG tags are static, generic and baked into the HTML. |

### Platform limits checked (verify again before launch)
- **Workers Free:** 100,000 requests/day (Error 1027 beyond), ~10 ms CPU per invocation. 1000 guests opening a link a few times each is tens of thousands of requests at most, but note static asset requests are reported as free. The 10 ms CPU limit is fine for D1 lookups; keep JWT verification lean and cache the JWKS.
- **D1 Free:** 5 million rows read/day, 100,000 rows written/day, 500 MB per database. Docs and release notes disagree on the free-tier enforcement date (Feb 2025 vs a 2026-09-01 changelog entry), so assume limits are enforced. Always query by indexed `code` to avoid full scans; avoid scanning the guests table on every guest hit.
- **Pages vs Workers:** Cloudflare's current direction is to start new projects on **Workers with static assets**; Pages still works but new features go to Workers. Remember that Workers serves static assets before your script by default, so API routes need `assets.run_worker_first` (or route patterns) configured, and an `.assetsignore` file is needed. Custom headers for static assets are only partially supported, so set security headers inside the Worker.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Access OTP not usable on workers.dev hostname, or needs card/custom domain | Admin phase delayed | Spike it in phase 1 (protect a hello-world Worker). Fallback: password + signed cookie, or buy a cheap domain. |
| Access protects the page but the Worker doesn't verify JWT | Admin API exposed | Verify in Worker middleware on every admin route; add tests that call each route directly with no/invalid/expired token. |
| Rate limiting on free plan weaker than assumed | Abuse/brute force | Unguessable codes (10+ chars, CSPRNG) are the primary defence; rate limit is secondary. Add D1-backed or WAF fallback if needed. |
| Intro animation heavy on old Android | Poor first impression for elders | CSS-only transforms, lazy-load assets, reduced-motion path, a skip control, test on an older phone; ship a lighter fallback if needed (requirement A6). |
| Gujarati font weight/rendering | Slow or broken text | Subset Noto Sans Gujarati, `font-display: swap`, system fallbacks, test on real devices. |
| Daily free-tier caps hit around invite blast day | Guests see errors | Estimated load is far below caps; monitor, and the paid Workers plan is a cheap escape hatch. |
| Content (GU copy, events, photos) arrives late | Launch delay | Placeholders through phase 7 (already agreed). |
| `wa.me` from iOS home-screen app unverified | Admin can't send easily | Keep Copy and Share; test early on owner's phone. |
| Headcount leak via guest API | Privacy breach | Explicit response allow-list plus automated test asserting no headcount/id fields. |

## Recommended stack

### Backend
**Cloudflare Workers (TypeScript) + Hono + Cloudflare D1**, with the API and static frontend deployed as a single Worker using static assets.
- **Why:** mandated host and database; one deploy unit; Hono is tiny, runs natively on Workers, and gives clean routing and middleware (auth, validation, security headers). D1 is SQLite, ideal for this data shape. Use `wrangler` migrations for schema and a validation library such as Zod (or hand-rolled checks) for strict input validation.
- **Auth:** Cloudflare Access (OTP) in front of `/admin*` and `/api/admin*`, plus Worker middleware verifying `Cf-Access-Jwt-Assertion` (e.g. with `jose`).
- **Considered and rejected:**
  - *Python/FastAPI* (team default): not natively supported on Workers, and would need separate hosting, breaking the free single-platform requirement.
  - *Pages Functions*: still supported but Cloudflare steers new work to Workers static assets.
  - *Separate backend (Node/other host)*: extra cost, extra moving parts, no benefit at this scale.

### Frontend
**Preact + Vite + TypeScript** (preliminary; design-architect to confirm).
- **Why:** about 3-4 KB runtime, but the admin area (table, filters, forms, dialogs, CSV import, template editor) and the language-switching guest page both benefit from components and state. Hand-rolled vanilla JS for the admin would get messy. Preact adds negligible weight to the guest page.
- **Guest page** can stay mostly declarative with CSS animations; i18n via `en.json`/`gu.json` and a tiny lookup helper.
- **Admin bundle** is a separate entry, so SheetJS and admin code never load for guests.
- **Considered and rejected:** vanilla JS (maintainability for admin); React/Vue/Svelte (heavier or unnecessary for this size, though Svelte would also work).

### Infra / hosting
- Cloudflare free plan, Worker with static assets and a D1 binding, private Git repo, deployed with `wrangler`. Free `*.workers.dev` URL at launch.
- Security headers and CSP set in the Worker. Generic OG tags in static HTML.
- Hard constraints known: free-tier limits above; no phone numbers stored.

## Rough complexity / timeline read
Small-to-medium project. Backend and admin are routine; most of the effort is in the guest-page polish (intro, motion, Gujarati, device testing) and the hardening and testing checklist. Roughly: setup plus static guest page, then backend/RSVP, then admin plus import/export, then hardening and content. The brief's 9 phases with check-ins are a sensible shape; the wedding date is unknown, so there is no deadline to sanity-check yet. Content from the owner (Gujarati copy, events, photos) is the likeliest schedule bottleneck, not engineering.

## Carried-forward assumptions
- A1: "Yes" covers the whole invitation. The schema should leave room to add an attending count later.
- A2: Free workers.dev subdomain at launch. Depends on the Access spike succeeding.
- A3: Dummy data and placeholders through phase 7.
- A4: One or a few admin emails (well under the 50-user Access free limit).
- A6: The poster-then-envelope intro stays light enough; fall back to a single intro if not.
- Open from requirements: the Access-on-workers.dev check, free-plan rate-limit availability, and iOS `wa.me` behaviour are all still to be verified hands-on; the Pages vs Workers question is now answered (Workers static assets).

## Sources
- Cloudflare: Pages and Workers converging, and the Workers static assets migration and compatibility docs
- Cloudflare One docs: One-time PIN login; changelog 2025-10-03 (Access for workers.dev)
- Cloudflare D1 pricing and limits docs; Workers limits docs; Rate Limiting binding docs and 2025-09-19 GA changelog
