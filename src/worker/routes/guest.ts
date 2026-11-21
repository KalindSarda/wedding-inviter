import { Hono } from "hono";
import type { Env } from "../index";
import { findGuestViewByCode } from "../lib/db";
import { MAX_LOOKUP_LENGTH } from "../lib/validation";

export const guestRoutes = new Hono<{ Bindings: Env }>();

// Unknown, malformed and deleted codes all produce this exact response, so nothing about
// code validity or format is revealed.
function notFound() {
  return new Response(
    JSON.stringify({ error: { code: "not_found", message: "Invitation not found." } }),
    { status: 404, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

guestRoutes.get("/:code", async (c) => {
  const code = c.req.param("code");
  if (code.length > MAX_LOOKUP_LENGTH) return notFound();

  // Even malformed codes go through the same indexed (bound-parameter) lookup, so timing does not
  // distinguish "bad format" from "valid format, no such guest".
  const guest = await findGuestViewByCode(c.env.DB, code);
  if (!guest) return notFound();

  c.header("Cache-Control", "no-store");
  // Built field by field: never spread a DB row into a response.
  return c.json({
    name: guest.name,
    events: guest.events,
    rsvpStatus: guest.rsvpStatus,
    defaultLang: guest.defaultLang,
  });
});
