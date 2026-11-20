---
stage: api-schema
generated_by: dev-api-skill
stack:
  backend: cloudflare-workers-typescript-hono-d1
  frontend: preact-vite-typescript
based_on: [.claude-sdlc/outputs/03-architecture.md]
status: draft
---

# API & Schema — Personalised Wedding Invitation Website

## Conventions

Decisions below were made from the architecture and project scale (single Worker, one consumer app, <= ~1000 guests). They are proposals, easy to change before implementation.

- **Stack idiom:** Hono routes, **Zod** schemas as the single source of validation; TypeScript types inferred with `z.infer`. Every body, param and query is parsed with `.strict()` objects (unknown keys rejected). D1 access via prepared statements with bound parameters only.
- **Base path / versioning:** `/api/...`, no version prefix (single first-party client, deployed together). Add `/v2` only if a breaking change is ever needed.
- **Format:** JSON (`application/json; charset=utf-8`), except the import endpoint, which also accepts `text/csv`. Timestamps are ISO 8601 UTC strings (`2026-11-20T10:15:00.000Z`). Field names are `camelCase` in the API (DB columns stay `snake_case`; mapping happens in `lib/db.ts`).
- **Auth:**
  - `/api/guest/*`: no login; possession of the unguessable `code` is the credential.
  - `/api/admin/*`: verified Cloudflare Access JWT (`Cf-Access-Jwt-Assertion`: signature, `aud`, `iss`, `exp`) and email in the admin allow-list. Fallback strategy: signed HttpOnly cookie. Missing/invalid -> `401`; valid identity not allow-listed -> `403`. No admin route is exempt (a test enumerates the router).
- **Pagination:** none. The admin list returns all guests in one response (cap 2000 rows); search and filter are client-side. Revisit only if the list exceeds that.
- **Error envelope (all non-2xx):**
  ```ts
  type ApiError = {
    error: {
      code: "not_found" | "validation_failed" | "unauthorized" | "forbidden" |
            "rate_limited" | "conflict" | "payload_too_large" | "internal";
      message: string;              // safe, generic, no PII, no stack traces
      details?: { path: string; message: string }[]; // validation_failed only
      retryAfterSeconds?: number;   // rate_limited only
    }
  }
  ```
  Guest-facing errors are deliberately generic: unknown, malformed or deleted codes all return the identical `404 not_found` body, so code validity is not revealed. Unexpected errors return `500 internal` and are logged without PII (route, status, truncated code hash).
- **Rate limiting:** public endpoints only (`429`, `Retry-After` header plus `retryAfterSeconds`). Suggested starting limits: `GET /api/guest/:code` 60/min per IP; `POST .../rsvp` 10/min per IP and 5/min per code. Admin routes rely on Access, plus a modest per-identity limit on import.
- **Idempotency:** `PUT` and `DELETE` are idempotent. RSVP POST is safe to repeat; an identical repeat does not append a new `rsvp_log` row.
- **Caching:** all API responses `Cache-Control: no-store`.
- **CORS:** none; same-origin only.
- **Reference data:** `Slug` values are validated against the slugs in `config/events.json`.

### Shared schemas (Zod)

```ts
const Lang = z.enum(["en", "gu"]);
const RsvpStatus = z.enum(["yes", "no"]);

// Code: 12 chars from unambiguous uppercase alphabet (no 0,O,1,I,L)
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GuestCode = z.string().regex(/^[2-9A-HJKMNP-Z]{10,16}$/);

const EventSlug = z.string().refine(s => EVENT_SLUGS.has(s)); // from events.json

const GuestName = z.string()
  .transform(s => s.normalize("NFC").trim().replace(/\s+/g, " "))
  .pipe(z.string().min(1).max(100)
    .refine(s => !/[\u0000-\u001F\u007F<>]/.test(s))); // no control chars or angle brackets

const Headcount = z.number().int().min(1).max(50);
const EventList = z.array(EventSlug).min(1).max(20)
  .refine(a => new Set(a).size === a.length); // no duplicates
```

Notes: names are escaped on render regardless (defence in depth); rejecting `<>` is an extra guard, not the primary one. Names in Gujarati script pass validation (normalised NFC). An invitation with zero events is not allowed (at least one).

## Endpoints

### GET /api/guest/:code
- **Purpose:** return what the guest page needs to personalise itself.
- **Auth:** none (code is the credential). Rate limited.
- **Request:** path param `code` (any string; matched against the DB only if it passes the format check, otherwise the same 404 is returned).
- **Response 200:**
  ```ts
  const GuestView = z.object({
    name: z.string(),
    events: z.array(EventSlug),          // ordered by config `order`
    rsvpStatus: RsvpStatus.nullable(),
    defaultLang: Lang,
  }).strict();
  ```
  The handler builds this object field by field. It never spreads a DB row. **Never** includes `headcount`, `id`, `code`, timestamps or `rsvp_log`.
- **Errors:** `404 not_found` (unknown/malformed/deleted code; identical body), `429 rate_limited`, `500 internal`.

### POST /api/guest/:code/rsvp
- **Purpose:** set or change the guest's answer.
- **Auth:** none (code). Rate limited per IP and per code.
- **Request:**
  ```ts
  const RsvpBody = z.object({ status: RsvpStatus }).strict();
  ```
- **Behaviour:** in one D1 batch: update `rsvp_status`, `rsvp_updated_at`, `updated_at`; append to `rsvp_log` (skipped if status equals the current one).
- **Response 200:** `{ rsvpStatus: "yes" | "no" }` (no timestamp, no id).
- **Errors:** `400 validation_failed` (bad/missing `status`, extra keys, non-JSON), `404 not_found`, `415`-style bodies map to `400 validation_failed`, `429 rate_limited`, `500 internal`.

### GET /api/admin/guests
- **Purpose:** full guest list for the admin table, export and dashboard cross-checks.
- **Auth:** admin.
- **Response 200:**
  ```ts
  const AdminGuest = z.object({
    id: z.number().int(),
    code: GuestCode,
    name: z.string(),
    headcount: z.number().int(),
    events: z.array(EventSlug),
    defaultLang: Lang,
    rsvpStatus: RsvpStatus.nullable(),
    rsvpUpdatedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  });
  const AdminGuestList = z.object({ guests: z.array(AdminGuest) });
  ```
  Sorted by `createdAt` ascending, then `id`. The client builds the link as `${origin}/i/${code}`.
- **Errors:** `401`, `403`, `500`.

### POST /api/admin/guests
- **Purpose:** create a guest; the server generates the code.
- **Auth:** admin.
- **Request:**
  ```ts
  const CreateGuest = z.object({
    name: GuestName,
    headcount: Headcount,
    events: EventList,
    defaultLang: Lang,
  }).strict();
  ```
- **Behaviour:** generate code with CSPRNG; on unique-constraint collision regenerate and retry (max 5), then `500`. Insert guest and guest_events in one batch.
- **Response 201:** `AdminGuest`.
- **Errors:** `400 validation_failed` (includes unknown event slug), `401`, `403`, `500`.

### PUT /api/admin/guests/:id
- **Purpose:** edit a guest. The code never changes here. RSVP fields are not editable.
- **Auth:** admin.
- **Request:** path `id` positive integer; body same shape as `CreateGuest` (full replacement, all four fields required).
- **Behaviour:** update guest, replace guest_events in one batch, bump `updated_at`. Removing an event a guest was invited to simply removes it from their page.
- **Response 200:** `AdminGuest`.
- **Errors:** `400 validation_failed`, `404 not_found`, `401`, `403`, `500`.

### DELETE /api/admin/guests/:id
- **Purpose:** delete a guest, invalidating their link.
- **Behaviour:** delete the guest row; `guest_events` and `rsvp_log` rows cascade (decision: logs deleted too). UI must confirm and mention the link will stop working.
- **Response:** `204` no body. Repeat deletes of a missing id return `404 not_found`.
- **Errors:** `400 validation_failed` (bad id), `404`, `401`, `403`, `500`.

### POST /api/admin/guests/:id/regenerate-code  *(optional, recommended)*
- **Purpose:** issue a new link if one leaks; the old link stops working immediately.
- **Request:** no body.
- **Response 200:** `AdminGuest` (with the new `code`).
- **Errors:** `404`, `401`, `403`, `500`.

### POST /api/admin/guests/import
- **Purpose:** bulk-create guests from CSV with a per-row report.
- **Auth:** admin. Body limit 256 KB; max 1000 data rows.
- **Request (JSON):**
  ```ts
  const ImportBody = z.object({
    csv: z.string().max(262144),
    dryRun: z.boolean().default(false),
  }).strict();
  ```
  CSV columns (header row required, case-insensitive): `name, headcount, events, default_lang`. `events` is a semicolon-separated list of slugs. Quoted fields supported. UTF-8 with optional BOM. Blank lines ignored. `default_lang` may be empty and then defaults to `en` (reported as a warning).
- **Behaviour (default, proposed):** **all-or-nothing.** Every row is validated against `CreateGuest` first; if any row is invalid nothing is written and the report says so. With zero errors, all rows are inserted in one D1 batch. `dryRun: true` validates and reports without writing, so the UI can preview. (If the owner prefers partial import, change to "insert valid rows, report the rest": same report shape, `committed` counts the valid rows.)
- **Duplicate names:** allowed (families can share names) but flagged as a warning, not an error.
- **Response 200:**
  ```ts
  const ImportReport = z.object({
    dryRun: z.boolean(),
    committed: z.boolean(),         // false when dryRun or any error (all-or-nothing)
    totalRows: z.number().int(),
    validRows: z.number().int(),
    invalidRows: z.number().int(),
    created: z.number().int(),      // 0 unless committed
    rows: z.array(z.object({
      row: z.number().int(),        // 1-based data row (header excluded)
      ok: z.boolean(),
      errors: z.array(z.object({ field: z.string(), message: z.string() })),
      warnings: z.array(z.string()),
    })),
  });
  ```
  Validation failures inside rows are a **200 with a report**, not a 4xx, so the UI always gets the full per-row detail.
- **Errors:** `400 validation_failed` (body not JSON, missing header/columns, unknown columns, > 1000 rows), `413 payload_too_large`, `401`, `403`, `429` (per-identity), `500`.

### GET /api/admin/stats
- **Purpose:** dashboard numbers, computed by one aggregate query so they always match the list.
- **Auth:** admin.
- **Response 200:**
  ```ts
  const Bucket = z.object({ invitations: z.number().int(), headcount: z.number().int() });
  const Stats = z.object({
    total: Bucket,
    yes: Bucket,
    no: Bucket,
    pending: Bucket,                       // rsvp_status IS NULL: the number to act on
    perEvent: z.array(z.object({
      slug: EventSlug,
      invited: Bucket,
      yes: Bucket,                         // Yes-only subtotal
    })),
  });
  ```
  Invariant: `yes + no + pending = total` (both fields).
- **Errors:** `401`, `403`, `500`.

### Non-API routes (for completeness)
- `GET /i/:code` and `GET /admin*`: static SPA shells (HTML). `/admin*` is behind Access. Not JSON; no data in the shell.
- `GET /robots.txt`: disallows `/i/` and `/admin`. Guest pages also carry `noindex`.

## Example requests/responses

**1. Guest opens link (most important public call)**
```http
GET /api/guest/7KQ3M9XPA4TW HTTP/1.1
```
```json
200 OK
Cache-Control: no-store

{
  "name": "Rakesh Uncle & Family",
  "events": ["sangeet", "wedding"],
  "rsvpStatus": null,
  "defaultLang": "gu"
}
```
Unknown code:
```json
404 Not Found
{ "error": { "code": "not_found", "message": "Invitation not found." } }
```

**2. Guest RSVPs**
```http
POST /api/guest/7KQ3M9XPA4TW/rsvp
Content-Type: application/json

{ "status": "yes" }
```
```json
200 OK
{ "rsvpStatus": "yes" }
```
Invalid body `{ "status": "maybe" }`:
```json
400 Bad Request
{ "error": { "code": "validation_failed", "message": "Invalid request.",
  "details": [{ "path": "status", "message": "Invalid enum value" }] } }
```

**3. Admin import (most complex endpoint), dry run with one bad row**
```http
POST /api/admin/guests/import
Content-Type: application/json

{ "dryRun": true,
  "csv": "name,headcount,events,default_lang\nRakesh Uncle & Family,5,sangeet;wedding,gu\nMeera Aunty,0,wedding,en\nJay,2,haldi,en" }
```
```json
200 OK
{
  "dryRun": true,
  "committed": false,
  "totalRows": 3,
  "validRows": 1,
  "invalidRows": 2,
  "created": 0,
  "rows": [
    { "row": 1, "ok": true,  "errors": [], "warnings": [] },
    { "row": 2, "ok": false, "errors": [{ "field": "headcount", "message": "Must be an integer between 1 and 50" }], "warnings": [] },
    { "row": 3, "ok": false, "errors": [{ "field": "events", "message": "Unknown event slug: haldi" }], "warnings": [] }
  ]
}
```

**4. Admin without valid auth**
```http
GET /api/admin/guests
```
```json
401 Unauthorized
{ "error": { "code": "unauthorized", "message": "Authentication required." } }
```

## Decisions to confirm
- Import is **all-or-nothing** (default proposal from architecture). Say so if you want partial import instead.
- Import supports `dryRun` preview. This is an addition beyond the brief, useful for non-technical admin use.
- Headcount capped at 50 per invitation and names at 100 chars. These are arbitrary guardrails; adjust if a real invitation needs more.
- No pagination or API versioning, by design at this scale.
