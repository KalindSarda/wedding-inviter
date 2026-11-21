import { orderKnownSlugs } from "./events";

/** What the guest page may see. Deliberately has no headcount, id or code. */
export type GuestView = {
  name: string;
  events: string[];
  rsvpStatus: "yes" | "no" | null;
  defaultLang: "en" | "gu";
};

type GuestRow = {
  name: string;
  default_lang: "en" | "gu";
  rsvp_status: "yes" | "no" | null;
  event_slug: string | null;
};

export type RsvpStatus = "yes" | "no";

export type GuestIdentity = { id: number; rsvpStatus: RsvpStatus | null };

/** Minimal indexed lookup used by write paths. Internal only: never returned to clients. */
export async function findGuestIdentity(db: D1Database, code: string): Promise<GuestIdentity | null> {
  const row = await db
    .prepare("SELECT id, rsvp_status FROM guests WHERE code = ?")
    .bind(code)
    .first<{ id: number; rsvp_status: RsvpStatus | null }>();
  return row ? { id: row.id, rsvpStatus: row.rsvp_status } : null;
}

/**
 * Record a guest's answer. Update and history append happen in ONE batch (atomic); an unchanged
 * answer writes nothing, so repeat taps never spam rsvp_log or move rsvp_updated_at.
 */
export async function writeRsvp(db: D1Database, guest: GuestIdentity, status: RsvpStatus): Promise<void> {
  if (guest.rsvpStatus === status) return;
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare("UPDATE guests SET rsvp_status = ?, rsvp_updated_at = ?, updated_at = ? WHERE id = ?")
      .bind(status, now, now, guest.id),
    db.prepare("INSERT INTO rsvp_log (guest_id, status, created_at) VALUES (?, ?, ?)").bind(guest.id, status, now),
  ]);
}

/**
 * One indexed lookup (guests.code is UNIQUE). Prepared statement with a bound parameter only.
 * The SELECT list is an allow-list: headcount and id are never read for the guest view.
 */
export async function findGuestViewByCode(db: D1Database, code: string): Promise<GuestView | null> {
  const { results } = await db
    .prepare(
      `SELECT g.name, g.default_lang, g.rsvp_status, ge.event_slug
         FROM guests g
         LEFT JOIN guest_events ge ON ge.guest_id = g.id
        WHERE g.code = ?`,
    )
    .bind(code)
    .all<GuestRow>();

  const first = results[0];
  if (!first) return null;

  return {
    name: first.name,
    events: orderKnownSlugs(results.flatMap((r) => (r.event_slug ? [r.event_slug] : []))),
    rsvpStatus: first.rsvp_status,
    defaultLang: first.default_lang,
  };
}
