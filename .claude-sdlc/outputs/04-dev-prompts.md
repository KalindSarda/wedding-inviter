---
stage: dev-prompts
generated_by: dev-prompt-skill
stack:
  backend: cloudflare-workers-typescript-hono-d1
  frontend: preact-vite-typescript
based_on: [.claude-sdlc/outputs/01-requirements.md, .claude-sdlc/outputs/03-architecture.md]
status: draft
---

# Dev & Product Prompts — Personalised Wedding Invitation Website

## Scope
- **Dev-agent task prompts only.** The product has no LLM-powered feature (guest copy is static, written by the owner), so there are **no product LLM prompts**.
- **Runner:** Claude Code in the repo `E:\Projects\Research\wedding-inviter`. One prompt per build phase, matching the brief's phases 1-9. Paste one at a time; stop and check in after each phase (brief's working rule).
- **Every prompt implicitly includes the Shared preamble below.** Paste it first, or keep it in a `CLAUDE.md` at the repo root (recommended).

### Shared preamble (put in CLAUDE.md)
```
Project: personalised bilingual (EN / ગુજરાતી) wedding invitation site. Read these before any work:
- .claude-sdlc/outputs/01-requirements.md (what/why)
- .claude-sdlc/outputs/03-architecture.md (structure, stack, security design: authoritative)
- .claude-sdlc/outputs/05-api-schema.md (API contract: build to it verbatim)
- wedding-invite-handoff-brief.md (original brief)

Stack (final): one Cloudflare Worker (TypeScript, Hono) serving static assets + /api, D1 database,
Zod for validation, jose for JWT, Preact + Vite + TypeScript with two entry points (guest, admin), vitest.

Rules:
1. Ask before assuming anything not covered by those docs. Do not widen scope (see each phase's "Out of scope").
2. Verify current Cloudflare docs/limits (Workers, D1, Access, rate limiting, static assets) before relying on them; do not trust the docs in this repo for pricing/limits.
3. Security is non-negotiable: parameterised queries only; guest API never returns headcount/id/code/other guests; admin auth verified server-side on every /api/admin route; escape all names; no PII (names) in logs; no phone numbers stored.
4. Mobile-first, light bundles, accessible, honour prefers-reduced-motion. Gujarati strings I have not supplied are marked [GU-PLACEHOLDER], never machine-translated.
5. Out of scope for the whole project: calendar integration, travel/hotel/directions, dietary/guest-count RSVP fields, parking FAQ, music (hook only), phone numbers.
6. Work in small commits-in-spirit; run tests and typecheck before declaring done. When the phase is done, summarise what changed, what you verified (and how), what you did not verify, and wait for my go-ahead.
```

## Dev-agent task prompts

### Phase 1 — Project setup (+ Access spike)
**Prompt**
```
Phase 1: project setup. Create the repo scaffold per the "Repo layout" in 03-architecture.md:
Vite + Preact + TypeScript with two entries (guest at /i/:code, admin at /admin), a Hono Worker in
src/worker, wrangler config (static assets with run_worker_first for /api/*, SPA fallback for /i/* and
/admin*, D1 binding), a first D1 migration creating guests, guest_events, rsvp_log exactly as in the
architecture's Data model (CHECK constraints, FK ON DELETE CASCADE, unique index on guests.code, indexes
on guest_events.guest_id and rsvp_log.guest_id), config/events.json with 3 DUMMY events (EN text, GU
as [GU-PLACEHOLDER]), i18n/en.json + gu.json scaffolding with a tiny t() helper, vitest with the Workers
pool, lint/typecheck scripts, a .assetsignore, and a README with run/deploy steps.
Then do the Access spike: first verify current Cloudflare docs. Determine whether Cloudflare Access can
be scoped to ONLY /admin* and /api/admin* (not the whole hostname) on a *.workers.dev address, and
whether OTP login works there. Report findings with doc links and the options: (a) works, (b) needs a
custom domain, (c) use password-cookie fallback. Do not enable Access on the whole worker hostname
(that would lock out guests). Ask me before creating any Cloudflare resources or spending money.
```
**Depends on:** nothing. **Acceptance:** `npm run dev` serves a "hello" guest page and `/api/health`; migration applies locally; typecheck + one passing vitest; spike report written in the reply (and appended to a short `docs/access-spike.md`). **Out of scope:** real UI, real endpoints, real content.

### Phase 2 — Guest page (static, dummy data)
**Prompt**
```
Phase 2: build the static guest page at /i/:code using dummy data only (no API yet; a local mock object
for { name, events, rsvpStatus, defaultLang }). Follow requirements 2-11 in 01-requirements.md:
poster title card ("A [Name] & [Name] Production") that transitions into an animated envelope, one tap
to open; greeting; short scroll story with light fade-in/parallax; countdown to the wedding date
(from config); events section from config/events.json showing ONLY the invited events (name, date/time,
venue linked via mapUrl, dress code); RSVP section UI (two large buttons, playful confirmation, visible
change-answer control: UI-only for now); funny FAQ (7 items from the brief, EN real, GU placeholders);
always-visible EN/ગુજરાતી toggle (opens in defaultLang, user choice persisted in localStorage, safe
try/catch); an unrendered MusicToggle extension point. Use CSS transforms/animations only, no
animation libraries and no video. Provide a visible Skip control on the intro. Respect
prefers-reduced-motion (intro becomes a simple fade or none). Self-host a subsetted Noto Sans Gujarati
with font-display: swap and system fallbacks. Generic Open Graph/Twitter tags, noindex meta, no guest name.
Lazy-load images. Escape the name by rendering via Preact text nodes (never innerHTML).
Report the gzipped size of the guest bundle and the first-load transfer; keep it lean (target well under
~150 KB JS+CSS excluding images and fonts; tell me if you can't).
```
**Depends on:** Phase 1. **Acceptance:** works at 360px width and desktop; keyboard operable; contrast sufficient; reduced-motion verified (emulate in browser); language toggle persists across reload; EN/GU swap without layout duplication; bundle sizes reported. **Out of scope:** API calls, admin, real photos/copy, music audio.

### Phase 3 — Backend and guest API
**Prompt**
```
Phase 3: implement GET /api/guest/:code exactly per 05-api-schema.md (GuestView, generic 404 for
unknown/malformed/deleted codes with an identical body, Cache-Control: no-store, error envelope).
Add lib/codes.ts (12-char CSPRNG codes from the unambiguous alphabet, rejection sampling, no modulo
bias), lib/validation.ts (shared Zod schemas), lib/db.ts (prepared statements only), lib/events.ts
(slug allow-list from events.json), and security-headers middleware (strict CSP, nosniff,
Referrer-Policy no-referrer, HSTS, frame-ancestors none, Permissions-Policy; also verify whether
headers reach static assets and, if not, use the assets _headers file or route HTML shells via the
Worker: report what you found). Seed script that inserts a few DUMMY guests (including one with an
XSS-style name like <script>alert(1)</script> and one Gujarati name). Wire the guest SPA to the real
API: personalised greeting, only invited events, loading and not-found states (neutral page).
Tests (vitest): the response has EXACTLY the keys name/events/rsvpStatus/defaultLang (headcount-privacy
test); unknown vs malformed vs deleted code give identical status+body; codes are the right length and
alphabet and unique across 10k generated; XSS-name renders as text.
```
**Depends on:** Phase 1-2, 05-api-schema.md. **Acceptance:** tests pass; guest page personalised from D1 locally; no names in logs (check). **Out of scope:** RSVP POST, admin, rate limiting (Phase 7).

### Phase 4 — RSVP
**Prompt**
```
Phase 4: implement POST /api/guest/:code/rsvp per 05-api-schema.md (strict RsvpBody, update
rsvp_status/rsvp_updated_at/updated_at and append rsvp_log in ONE D1 batch; skip the log row if status
is unchanged; response { rsvpStatus }). Wire the guest UI: tapping Yes/No calls the API, shows a
playful confirmation (EN real, GU placeholders), an inline error with retry on failure, and a
change-answer control that re-opens the buttons. The page must reflect the stored answer on reload.
Tests: valid yes/no; change yes->no->yes appends the right log rows; repeat identical answer appends
none; invalid status / extra keys / non-JSON -> 400 validation_failed envelope; unknown code -> generic
404; the guest GET still has exactly four keys after an RSVP.
```
**Depends on:** Phase 3. **Acceptance:** above tests pass; manual check of the full guest flow on a 360px viewport. **Out of scope:** guest counts, notes, admin views.

### Phase 5 — Admin auth first, then admin API and UI
**Prompt**
```
Phase 5, part A (auth, do this FIRST and stop for my check-in before part B): implement the adminAuth
middleware with a pluggable strategy per 03-architecture.md. Based on the Phase 1 spike result and my
decision, implement either access-jwt (verify Cf-Access-Jwt-Assertion with jose: signature against the
team JWKS (cached), aud, iss, exp, then email in the ADMIN_EMAILS allow-list) or password-cookie
(hashed password secret, HMAC-signed HttpOnly+Secure+SameSite=Strict cookie, brute-force throttling).
Mount ALL /api/admin/* under one router guarded by it. Add a test that enumerates every registered
admin route and asserts 401 with no token, 401 with an invalid/expired token, and 403 for a valid
identity not on the allow-list: test routes directly, not through the UI. Include a /api/admin/whoami
stub for the test.
Part B (after my go-ahead): implement GET/POST /api/admin/guests, PUT/DELETE /api/admin/guests/:id,
POST /api/admin/guests/:id/regenerate-code, GET /api/admin/stats exactly per 05-api-schema.md, then the
admin SPA at /admin: dashboard (total, Yes, No, Pending: invitations and headcount; per-event with
Yes-only subtotal), guest list (name, headcount, events, RSVP status, last updated, link) with name
search and All/Yes/No/Pending filter, add/edit form (name, headcount, event checkboxes, default
language), delete with a confirmation that says the link will stop working, per-row Copy link,
WhatsApp (wa.me/?text= with an owner-editable message template using {name} and {link}, template
stored in localStorage), and Web Share (hide if unsupported). Build links as `${origin}/i/${code}`.
Tests: stats invariants (yes+no+pending = total for both numbers) and that totals match the list;
delete cascades and the link then returns the generic 404; regenerate-code invalidates the old code;
create/edit validation errors.
```
**Depends on:** Phase 1 spike, Phase 3-4. **Acceptance:** per-route auth test passes; dashboard totals equal list totals; delete invalidates link. **Out of scope:** CSV import, Excel export (Phase 6), phone numbers.

### Phase 6 — CSV import and Excel export
**Prompt**
```
Phase 6: implement POST /api/admin/guests/import per 05-api-schema.md (JSON body with csv + dryRun;
header row required; quoted fields; UTF-8 BOM tolerated; max 1000 rows / 256 KB; per-row report with
errors and warnings; ALL-OR-NOTHING commit in one D1 batch unless I told you to switch to partial import).
Admin UI: file picker or paste box, a mandatory dry-run preview showing the per-row report, then a
Commit button enabled only when there are zero errors. Excel export in the browser with SheetJS,
lazy-loaded so it never enters the guest bundle: all fields incl. code, link, RSVP status and last-updated
time. Prefix any cell value starting with = + - @ with a single quote to prevent formula injection.
Tests: valid CSV, bad headcount, unknown slug, missing header, quoted commas/semicolons, BOM, >1000
rows, 413 on oversize, nothing written when any row is invalid (all-or-nothing), export row count and
columns match the list, formula-injection guard.
```
**Depends on:** Phase 5. **Acceptance:** import report matches the schema's example; exported file opens in Excel with correct Gujarati text. **Out of scope:** import of RSVP data, phone columns.

### Phase 7 — Hardening
**Prompt**
```
Phase 7: hardening and performance pass. (1) Rate limiting on public endpoints per 05-api-schema.md
(GET 60/min per IP; RSVP 10/min per IP and 5/min per code) with 429 + Retry-After + envelope. First
verify whether the Workers Rate Limiting binding is available on the free plan and how it behaves
(per-location, 10/60 s periods); if not suitable, implement the D1-counter or WAF-rule fallback and
tell me. Add a test that proves throttling triggers. (2) Re-verify headers/CSP on every response
type incl. static assets and the HTML shells; tighten the CSP (no inline scripts). (3) Re-audit
validation on every route, all queries parameterised, no names in logs (grep + test). (4) Performance:
image compression and lazy-loading, font subsetting check, report guest first-load transfer and Lighthouse
mobile scores; fix regressions. (5) Check the D1 query patterns for row-read efficiency (every hot
query hits an index; show EXPLAIN QUERY PLAN for the guest lookup and stats).
Deliver a short hardening report with before/after numbers and anything unresolved.
```
**Depends on:** Phases 3-6. **Acceptance:** rate-limit test passes; security-header audit table; Lighthouse numbers reported; no unindexed hot queries. **Out of scope:** new features.

### Phase 8 — Real content
**Prompt**
```
Phase 8: replace dummy content with the real content I provide (I will paste: couple names, events with
EN/GU names, dates/times, venues, mapUrls, dress codes, tagline/story EN+GU, FAQ GU, colour/mood
direction, photos, WhatsApp template, admin emails, final Gujarati). Do NOT write or machine-translate
Gujarati yourself; list every remaining [GU-PLACEHOLDER] and [EN-PLACEHOLDER] so I can fill them. Apply
the colour/mood direction through CSS custom properties. Compress images (WebP/AVIF with fallback,
responsive sizes, lazy-load). Set the generic Open Graph title/description/image (1200x630) with no
guest name, and verify the WhatsApp preview. Remove all dummy guests and dummy events.
```
**Depends on:** owner inputs (section 10 of the brief). **Acceptance:** zero placeholders left or an explicit list of those outstanding; OG preview verified; images within weight budget.

### Phase 9 — Testing and launch
**Prompt**
```
Phase 9: run the full test checklist in section 12 of wedding-invite-handoff-brief.md. Automate everything
automatable (security/privacy and functionality items) and give me a manual device checklist for the rest
(older Android Gujarati rendering, iPhone, slow-data load, wa.me/Copy/Share from the iPhone home-screen
app and desktop, reduced-motion). Produce a launch checklist: production D1 migration, secrets
(ADMIN_EMAILS, Access AUD/team domain or password hash), Access policy verified from a logged-out browser
(/admin and /api/admin blocked, /i/* and /api/guest/* open), robots/noindex, backup of the D1 data (export
command), and a rollback plan. Do not deploy or create/modify Cloudflare resources without my explicit go-ahead.
```
**Depends on:** all previous. **Acceptance:** checklist table with pass/fail/evidence per item; launch checklist reviewed by me.

## Things to validate before relying on these
(No product LLM prompts exist, so this is about the dev prompts and assumptions they encode; feeds `test-evaluation-skill`.)
- **Access path-scoping on workers.dev** (Phase 1 spike) decides Phase 5 part A's strategy; the prompts assume the result is reported before part A.
- **Bundle budget (~150 KB JS+CSS for the guest page)** is a proposed target, not a verified constraint; confirm it is realistic with the intro and parallax.
- **Rate limits (60/10/5 per minute)** are starting guesses; tune after watching real traffic patterns on invite day (many guests may open links at once from the same mobile carrier IP).
- **CSV all-or-nothing** is assumed (Phase 6) pending the owner's confirmation.
- **Assets headers behaviour** on Workers static assets must be verified in Phase 3/7 rather than assumed.
- **Dev prompts themselves:** after Phase 1, re-read these prompts against what the scaffold actually produced and amend any path or command names that drifted.
