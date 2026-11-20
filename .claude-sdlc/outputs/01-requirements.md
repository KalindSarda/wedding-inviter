---
stage: requirements
generated_by: requirement-skill
stack:
  backend: unknown-not-yet-decided
  frontend: unknown-not-yet-decided
based_on: []
status: draft
---

# Requirements — Personalised Wedding Invitation Website

## Source
`wedding-invite-handoff-brief.md` (owner-authored handoff brief, pasted/attached by the user), plus clarifying answers given in chat during this stage.

## Summary
A mobile-first, bilingual (English / ગુજરાતી) wedding invitation site for a friend's wedding. Each guest receives a personal, unguessable link (shared via WhatsApp) that greets them by name, shows only their invited events and lets them RSVP Yes/No in one tap. An authenticated admin area lets the owner manage guests, track RSVPs and projected headcount, and send links. Tone: playful, elegant, cinematic. Expected scale: 300-1000 invitations.

## Functional requirements

### Guest page
1. The system shall serve a unique page per guest at a link containing a random code, and greet the guest by the stored name.
2. The system shall show a cinematic intro: a movie-poster title card ("A [Name] & [Name] Production") that transitions into an animated envelope, opened by one tap. *(Confirmed: both, in sequence.)*
3. The intro and all heavy animation shall be disabled or simplified when `prefers-reduced-motion` is set.
4. The page shall present a short scroll story with light fade-in/parallax effects, a countdown to the wedding day, an events section, an RSVP section and a funny FAQ.
5. The events section shall show one card per event the guest is invited to, with name, date/time, venue (optionally linked to Maps via `mapUrl`) and dress code, and nothing else. Events are read from `config/events.json`.
6. The page shall never display events the guest is not invited to.
7. The RSVP section shall offer two large buttons ("Yes, I'm coming" / "Sorry, can't make it"), show a playful confirmation, and keep a visible control to change the answer later.
8. RSVP is per invitation and all-or-nothing; there are no guest counts, dietary or other fields. *(Confirmed.)*
9. The page shall provide an always-visible English/ગુજરાતી toggle. It opens in the guest's `default_lang`; a manual choice overrides it and persists in the browser.
10. All copy shall live in per-language files (`en.json`, `gu.json`) with one shared layout. Missing Gujarati copy shall be clearly marked placeholders.
11. The page shall expose a clean hook for a future off-by-default music toggle (no music now).
12. Unknown or malformed codes shall show a neutral not-found page that does not reveal whether the code format is valid.

### Guest API
13. `GET /api/guest/:code` shall return only `{ name, events[], rsvpStatus, defaultLang }`, never headcount, guest id, other guests' data or admin fields.
14. `POST /api/guest/:code/rsvp` shall accept `{status: "yes"|"no"}` with strict validation, update `rsvp_status`/`rsvp_updated_at`, and append to `rsvp_log`. Repeat calls change the answer.
15. Public endpoints shall be rate-limited per IP and per code.

### Admin
16. The system shall enforce authentication on the server for every `/api/admin/*` route (and the admin UI), independent of UI hiding. Chosen approach: **Cloudflare Access (email OTP) plus Worker-side verification of the Access JWT** (signature, audience, expiry). *(Confirmed; current requirements to be verified in feasibility.)*
17. Admin API: list guests, create guest (server generates code), edit guest (name, headcount, events, default_lang; code unchanged), delete guest, CSV bulk import with per-row validation report, stats, and optionally regenerate code.
18. Deleting a guest shall delete their guest_events, their rsvp_log rows and invalidate their link. *(Confirmed.)*
19. The dashboard shall show: total invitations, total projected headcount; Yes, No and No-response each as invitations and headcount; optionally headcount per event with a Yes-only subtotal.
20. The guest list shall show name, headcount, invited events, RSVP status, last updated and guest link, with search by name and filter All/Yes/No/Pending.
21. Per row: Copy link; WhatsApp (`wa.me/?text=` with an owner-editable message template using `{name}` and `{link}`); Web Share; Edit; Delete (with confirmation noting the link will stop working).
22. The admin shall have an add-guest form (name, headcount >= 1, event checkboxes, default language).
23. CSV import columns: name, headcount, events (semicolon-separated slugs), default_lang. Invalid rows shall be reported, never silently dropped.
24. Excel export shall include all fields (including RSVP status and last-updated time), generated in the browser from admin API data.

## Non-functional requirements
- **Security:** guest codes >= 10 chars from a CSPRNG, unambiguous alphabet (no 0/O/1/l/I), not sequential or name-based; parameterised queries only; input validation and output escaping (names appear on pages and WhatsApp text); security headers and sensible CSP; no names in plain logs.
- **Privacy:** headcount never exposed by guest API (automated test required); no phone numbers stored; Open Graph tags generic with no guest name.
- **Performance:** light first load for mid-range phones on mobile data; compressed, lazy-loaded images; no heavy framework.
- **Accessibility:** adequate contrast and tap targets, keyboard operable, reduced-motion support; elders must never feel lost.
- **Compatibility:** Gujarati renders correctly (e.g. Noto Sans Gujarati with fallbacks) on older Android and iPhone; works on desktop.
- **Scale:** 300-1000 invitations; free-tier Cloudflare limits to be verified against this.
- **Cost:** Cloudflare free plan, private Git repo.
- **Delivery:** build in the brief's 9 phases with a check-in after each; WhatsApp OG preview must show a proper image and title.

## Assumptions
- A1: A "Yes" covers the entire invitation headcount. *If wrong,* add an attending-count field (schema change in rsvp/guests).
- A2: Free Cloudflare subdomain (workers.dev/pages.dev) is used at launch. *If wrong or if Access needs a custom domain,* owner must buy one before the admin phase.
- A3: Dummy data and marked placeholders (couple names, events, GU copy, photos) are used through phases 1-7; real content arrives in phase 8.
- A4: Single admin or a small number of admin emails; no role separation.
- A5: Guests need no login; possession of the link is the credential.
- A6: Intro combines poster and envelope, adding some weight; it must still be performant. *If it's too heavy,* fall back to one of the two.

## Open questions
- Frontend framework (Vanilla JS vs Preact + Vite) was left to the feasibility stage.
- Does Cloudflare Access's free tier work on a workers.dev/pages.dev subdomain, or does it require a custom domain? Verify current docs (brief says not to trust it).
- Pages Functions vs Workers static assets: which is Cloudflare's current recommendation?
- With 300-1000 invitations, are D1 and Workers free-tier limits and rate-limiting options (e.g. built-in rate limit binding vs D1-based) adequate?
- Exact content still owed by owner: couple names, event list (EN/GU), tagline/story, photos, colour/mood, WhatsApp template, admin emails, final Gujarati.
- `wa.me` behaviour from an iOS home-screen web app is unverified; must be tested on the owner's phone (Copy and Share remain fallbacks).
- Launch date / wedding date unknown, which affects timeline.

## Tech stack hints from the client
- Hosting: Cloudflare free plan, private Git repo; static frontend plus API on Workers (Pages Functions vs Workers static assets to be confirmed).
- Database: Cloudflare D1 (SQLite).
- Frontend: lightweight; Vanilla JS or Preact with Vite; no heavy framework.
- Excel export: browser-side (e.g. SheetJS).
- Auth: Cloudflare Access with Worker JWT verification (fallback: password plus signed HttpOnly cookie).
- i18n: JSON per language; Noto Sans Gujarati.

## Out of scope
- Calendar integration / "Add to calendar"
- Travel hub, hotel info, directions (handled offline)
- Dietary preferences, guest counts or extra RSVP fields
- Parking FAQ
- Music (only a hook for later)
- Storing phone numbers
- Partial attendance in RSVP (v1)
