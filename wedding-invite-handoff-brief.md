# Wedding Invitation Website: Claude Code Handoff Brief

## 1. What we're building

An interactive, mobile-first wedding invitation site for a friend's wedding.

- **Guests** each get a personal link (via WhatsApp). The page greets them by name, shows only the events they are invited to, and lets them RSVP Yes or No with one tap.
- **The groom/bride (admin)** manages the guest list, sees RSVP stats and projected headcount, and sends links over WhatsApp.

**Tone:** a mix of playful, modern/elegant and cinematic. Think "a short film with a sense of humour, in a clean layout."

**Audience:** a wide age range, mostly on phones opening a WhatsApp link, some on desktop. Elders should never feel lost.

**Working rules for Claude Code**
- Ask before assuming anything not covered here.
- Verify current Cloudflare docs and free-tier limits (Workers, D1, Access) before relying on them. Do not trust this brief for pricing or limits.
- Build in the phases in section 11. Stop and check in after each phase.

---

## 2. Scope

### In scope
- Guest invitation page (themed, bilingual EN / ગુજરાતી)
- One-tap RSVP (Yes / No), changeable later
- Admin view: dashboard, guest list, add/edit/delete, copy link, WhatsApp, Share, CSV import, Excel export
- Per-guest event invitations
- Small backend and database
- Server-side admin authentication

### Out of scope (decided)
- No calendar integration / "Add to calendar"
- No travel hub, hotel info or directions section (handled offline)
- No dietary preferences, guest counts or extra fields in the RSVP
- No parking FAQ
- No music for now (leave a clean hook to add an off-by-default toggle later)
- No phone numbers stored

---

## 3. Stack

- **Hosting:** Cloudflare (free plan, private Git repo). Static frontend plus API on Workers (use whichever of Pages Functions or Workers static assets is Cloudflare's current recommendation, and confirm this first).
- **Database:** Cloudflare D1 (SQLite).
- **Frontend:** keep it light. Vanilla JS or Preact with Vite is fine. No heavy framework, since mobile data speeds and older phones matter.
- **Excel export:** generate in the browser from the admin API data (e.g. SheetJS), so no extra service.

---

## 4. Data model

Events are public content, so define them in a config file in the repo (not the database). The database stores guests and RSVPs.

### `config/events.json` (example shape)
```json
[
  {
    "slug": "sangeet",
    "name": { "en": "Sangeet", "gu": "" },
    "startsAt": "YYYY-MM-DDTHH:mm:ss+05:30",
    "venue": { "en": "", "gu": "" },
    "mapUrl": "",
    "dressCode": { "en": "", "gu": "" },
    "order": 1
  }
]
```
Each event card shows: name, date and time, venue (optionally linked to Maps via `mapUrl`) and dress code. Nothing else.

### D1 tables

**guests**
| column | type | notes |
|---|---|---|
| id | integer PK | |
| code | text unique | random, unguessable (see section 6) |
| name | text | how the guest is greeted, e.g. "Rakesh Uncle & Family" |
| headcount | integer >= 1 | people on this invitation, admin-only |
| default_lang | text | `en` or `gu`, sets the language the link opens in |
| rsvp_status | text null | `yes`, `no` or null (no response) |
| rsvp_updated_at | datetime null | |
| created_at / updated_at | datetime | |

**guest_events**: `guest_id`, `event_slug` (the events this guest is invited to)

**rsvp_log**: `id`, `guest_id`, `status`, `created_at` (append-only history, so a changed answer never loses the earlier one)

Deleting a guest deletes their guest_events and invalidates their link. Decide whether to keep rsvp_log rows (default: delete them too).

---

## 5. API

### Public (guest)
- `GET /api/guest/:code` returns `{ name, events: [slug...], rsvpStatus, defaultLang }`.
  - **Must never return headcount**, other guests' data, the guest id or the admin fields.
  - Unknown code: return a generic not-found response and show a neutral page. Do not reveal whether a code format is valid.
- `POST /api/guest/:code/rsvp` with `{ "status": "yes" | "no" }` updates `rsvp_status` and `rsvp_updated_at` and appends to rsvp_log. Guests may call it again to change their answer. Validate strictly.

### Admin (authenticated)
- `GET /api/admin/guests`: list with name, code, headcount, events, rsvp_status, rsvp_updated_at
- `POST /api/admin/guests`: create (generates the code)
- `PUT /api/admin/guests/:id`: edit (name, headcount, events, default_lang). The code does not change on edit.
- `DELETE /api/admin/guests/:id`
- `POST /api/admin/guests/import`: CSV bulk import (columns: name, headcount, events as semicolon-separated slugs, default_lang). Return a per-row validation report. Do not partially fail silently.
- `GET /api/admin/stats`: see dashboard below
- (optional) `POST /api/admin/guests/:id/regenerate-code`: issue a new link if one leaks

**Rate limiting** on the public endpoints (per IP and per code).

---

## 6. Security (treat as non-negotiable)

1. **Admin auth is enforced on the server for every admin route**, not just by hiding the page.
   - Preferred: Cloudflare Access (email one-time PIN) in front of `/admin*` and `/api/admin*`, **and** the Worker verifies the Access JWT (`Cf-Access-Jwt-Assertion`) itself, checking signature, audience and expiry.
   - Fallback if Access does not fit: a password check in the Worker with a signed, HttpOnly, Secure, SameSite cookie, plus brute-force protection.
2. **Guest codes:** at least 10 characters from a cryptographically secure random source, using an alphabet without look-alike characters (no 0/O, 1/l/I). No sequential or name-based codes.
3. **Headcount privacy:** the guest API never exposes it. Add an automated test that asserts this.
4. Validate and sanitise all input. Parameterised queries only. Escape names when rendering (guests' names appear on pages and in WhatsApp text).
5. Do not log personal data (names) in plain logs.
6. Security headers and a sensible CSP.
7. The link preview (Open Graph) must be generic, since previews are fetched without personalisation. Do not put the guest's name in OG tags.

---

## 7. Guest page

### Flow
1. **Cinematic intro:** an animated envelope or a movie-poster style opener ("A [Name] & [Name] Production"). One tap to open. Respect `prefers-reduced-motion`.
2. **Greeting:** "[Guest name], you're invited" (name fetched from the API).
3. **Scroll story:** short, playful, elegant. Fade-ins and light parallax. Keep it fast.
4. **Countdown** to the wedding day.
5. **Events:** a card per invited event (name, date and time, venue, dress code).
6. **RSVP:** two large buttons, "Yes, I'm coming" and "Sorry, can't make it". After tapping, show a playful confirmation, and keep a visible way to change the answer.
7. **Funny FAQ.**
8. **Language toggle** (English / ગુજરાતી), visible at all times.

### FAQ (English drafts; adapt to the couple)
- Is there food? → "Yes. Come hungry, leave in a food coma."
- Is there a dress code? → "Look good. The photographer is watching." (point to the events section for the real details)
- Do I need to bring a gift? → "Your presence is the gift. An envelope is also very good presence."
- Will the groom actually dance? → "Rumours say yes. We'll let you decide."
- Are kids allowed? → "Yes, and so is the chaos that comes with them."
- What time should I actually arrive? → "Indian Standard Time is a lovely concept. The ceremony, however, starts on time."
- What if I cry during the ceremony? → "Tissues are provided. Dignity is not."

### Language / i18n
- All text lives in per-language files (`en.json`, `gu.json`). No duplicated layouts.
- The page opens in the guest's `default_lang`. The toggle overrides it and the choice is remembered in the browser.
- Use a proper Gujarati web font (e.g. Noto Sans Gujarati), with fallbacks. Test on an older Android phone.
- Gujarati copy is written and polished by the owner (jokes do not machine-translate). Leave clearly marked placeholders.

### Design and performance
- Mobile-first, then desktop.
- Compress and lazy-load images. Keep first load light for mid-range phones on mobile data.
- Accessible: sufficient contrast, tap targets, keyboard use, reduced-motion support.
- Leave a clean hook for an off-by-default music toggle later.

---

## 8. Admin view

### Dashboard (top)
- Total invitations
- Total projected headcount (sum of headcount across all guests)
- **Yes:** invitations and headcount
- **No:** invitations and headcount
- **No response yet:** invitations and headcount (the number the owner acts on)
- Optional: headcount per event (sum of headcount for guests invited to that event, with Yes-only subtotal)

### Guest list (below)
Columns: name, headcount, invited events, RSVP status, last updated, guest link.

Per row:
- **Copy link**
- **WhatsApp:** opens `https://wa.me/?text=<encoded message>` (no phone number stored; WhatsApp shows its contact picker). The message is a template, e.g. "Hi {name}, you're invited! Here's your personal invitation: {link}". The owner should be able to edit the template text.
- **Share:** the Web Share API (native share sheet), as a fallback to WhatsApp
- **Edit** and **Delete** (delete with a confirmation that mentions the link will stop working)

List tools:
- Search by name
- Filter: All / Yes / No / Pending
- Add guest form (name, headcount, event checkboxes, default language)
- CSV import
- **Export to Excel** (all fields, including RSVP status and last-updated time)

---

## 9. WhatsApp / iPhone note

The admin may use the site as a home-screen app on iPhone. Behaviour of `wa.me` links from an iOS home-screen web app is **unverified**, so it must be tested on the owner's actual phone. Keep Copy and Share buttons as guaranteed fallbacks.

---

## 10. Inputs the owner must provide

- Names of the couple
- Event list: name, date, time, venue and dress code for each (EN and GU)
- Tagline / short story text (EN and GU)
- Photos (2 to 3, optional)
- Colour and mood direction
- WhatsApp message template
- Admin email address(es) for login
- Domain choice (free Cloudflare subdomain is fine to start)
- Final Gujarati translations

---

## 11. Build order

1. **Project setup:** repo, Cloudflare project, D1, config files, i18n scaffolding.
2. **Guest page (static):** intro, theme, events from config, FAQ, language toggle. Use dummy data.
3. **Backend and guest API:** guests table, `GET /api/guest/:code`, personalised greeting, per-guest events.
4. **RSVP:** POST endpoint, rsvp_log, change-answer flow, playful confirmations.
5. **Admin auth first**, then the admin API and UI: guest CRUD, dashboard, list, copy, WhatsApp, Share, search/filter.
6. **CSV import and Excel export.**
7. **Hardening:** rate limiting, security headers, input validation, performance pass.
8. **Real content:** final copy, Gujarati translations, images.
9. **Testing and launch** (checklist below).

---

## 12. Test checklist

**Security and privacy**
- [ ] Every `/api/admin/*` route returns 401/403 without valid auth (test each route directly, not just through the UI)
- [ ] Guest API response never contains headcount, ids or other guests' data (automated test)
- [ ] Unknown or malformed codes return the generic not-found response
- [ ] Codes are not guessable or sequential
- [ ] Rate limiting triggers on repeated requests
- [ ] Names with special characters or script tags render safely

**Functionality**
- [ ] Guest sees only their invited events
- [ ] RSVP works, can be changed, and the admin sees the update and timestamp
- [ ] Dashboard totals match the list (invitations and headcount, Yes / No / Pending)
- [ ] Add, edit and delete guest work. Delete invalidates the link.
- [ ] CSV import validates and reports bad rows
- [ ] Excel export opens correctly and matches the list
- [ ] Language toggle works, the choice persists, and `default_lang` is respected

**Devices and delivery**
- [ ] WhatsApp link preview shows a proper image and title (generic OG)
- [ ] Gujarati text renders correctly on an older Android phone and on iPhone
- [ ] Page is usable on slow mobile data (check load size and time)
- [ ] `wa.me` button, Copy and Share all work from the iPhone home-screen app and from desktop
- [ ] Reduced-motion setting disables heavy animation
