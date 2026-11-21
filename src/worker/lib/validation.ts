import { z } from "zod";
import { EVENT_SLUGS } from "./events";

// Shared input rules (single source of truth; see .claude-sdlc/outputs/05-api-schema.md).

export const Lang = z.enum(["en", "gu"]);
export const RsvpStatus = z.enum(["yes", "no"]);

// 10-16 chars from the unambiguous alphabet (no 0, 1, I, L, O).
export const GuestCode = z.string().regex(/^[2-9A-HJKMNP-Z]{10,16}$/);

export const EventSlug = z.string().refine((s) => EVENT_SLUGS.has(s), "Unknown event");

export const GuestName = z
  .string()
  .transform((s) => s.normalize("NFC").trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1)
      .max(100)
      // No control characters or angle brackets (defence in depth; names are escaped on render regardless).
      .refine((s) => !/[\u0000-\u001F\u007F<>]/.test(s), "Invalid characters"),
  );

export const Headcount = z.number().int().min(1).max(50);

export const EventList = z
  .array(EventSlug)
  .min(1)
  .max(20)
  .refine((a) => new Set(a).size === a.length, "Duplicate events");

/** Longest value we will even look up; anything longer cannot be a real code. */
export const MAX_LOOKUP_LENGTH = 64;
