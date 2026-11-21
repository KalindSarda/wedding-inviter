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
