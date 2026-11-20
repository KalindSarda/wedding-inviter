# Wedding invitation site: project rules

Personalised bilingual (EN / ગુજરાતી) wedding invitation site. Read before any work:
- `.claude-sdlc/outputs/01-requirements.md` (what/why)
- `.claude-sdlc/outputs/03-architecture.md` (structure, stack, security design: authoritative)
- `.claude-sdlc/outputs/05-api-schema.md` (API contract: build to it verbatim)
- `.claude-sdlc/outputs/04-dev-prompts.md` (per-phase build prompts)
- `wedding-invite-handoff-brief.md` (original brief)

Stack (final): one Cloudflare Worker (TypeScript, Hono) serving static assets + `/api`, D1 database,
Zod for validation, jose for JWT, Preact + Vite + TypeScript with two entry points (guest, admin), vitest.

Rules:
1. Ask before assuming anything not covered by those docs. Do not widen scope.
2. Verify current Cloudflare docs/limits (Workers, D1, Access, rate limiting, static assets) before relying on them.
3. Security is non-negotiable: parameterised queries only; guest API never returns headcount/id/code/other guests; admin auth verified server-side on every `/api/admin` route; escape all names; no PII (names) in logs; no phone numbers stored.
4. Mobile-first, light bundles, accessible, honour `prefers-reduced-motion`. Gujarati strings not supplied by the owner are marked `[GU-PLACEHOLDER]`, never machine-translated.
5. Out of scope for the whole project: calendar integration, travel/hotel/directions, dietary/guest-count RSVP fields, parking FAQ, music (hook only), phone numbers.
6. Run tests and typecheck before declaring a phase done. At the end of each phase, summarise what changed, what was verified (and how), what was not, and wait for the owner's go-ahead.
7. Never create Cloudflare resources, deploy, commit or push without explicit owner approval.
