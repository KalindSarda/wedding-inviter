import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../index";
import { findGuestIdentity, findGuestViewByCode, writeRsvp } from "../lib/db";
import { errorResponse, guestNotFound, validationFailed } from "../lib/errors";
import { MAX_LOOKUP_LENGTH, RsvpStatus } from "../lib/validation";

export const guestRoutes = new Hono<{ Bindings: Env }>();

guestRoutes.get("/:code", async (c) => {
  const code = c.req.param("code");
  if (code.length > MAX_LOOKUP_LENGTH) return guestNotFound();

  // Even malformed codes go through the same indexed (bound-parameter) lookup, so timing does not
  // distinguish "bad format" from "valid format, no such guest".
  const guest = await findGuestViewByCode(c.env.DB, code);
  if (!guest) return guestNotFound();

  c.header("Cache-Control", "no-store");
  // Built field by field: never spread a DB row into a response.
  return c.json({
    name: guest.name,
    events: guest.events,
    rsvpStatus: guest.rsvpStatus,
    defaultLang: guest.defaultLang,
  });
});

const RsvpBody = z.object({ status: RsvpStatus }).strict();
const MAX_BODY_BYTES = 1024;

guestRoutes.post("/:code/rsvp", async (c) => {
  const code = c.req.param("code");
  if (code.length > MAX_LOOKUP_LENGTH) return guestNotFound();

  // Unknown code is always the generic 404, whatever the body looks like, so a bad body can never
  // be used to probe which codes exist. (Rate limiting arrives in Phase 7.)
  const guest = await findGuestIdentity(c.env.DB, code);
  if (!guest) return guestNotFound();

  // JSON only: blocks cross-site <form> posts (which cannot send application/json).
  const type = c.req.header("Content-Type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) return validationFailed();

  const raw = await c.req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return errorResponse(413, "payload_too_large", "Request too large.");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return validationFailed();
  }

  const parsed = RsvpBody.safeParse(json);
  if (!parsed.success) {
    // Paths and generic messages only: never echo submitted values back.
    return validationFailed(
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: "Invalid value" })),
    );
  }

  await writeRsvp(c.env.DB, guest, parsed.data.status);

  c.header("Cache-Control", "no-store");
  return c.json({ rsvpStatus: parsed.data.status });
});
