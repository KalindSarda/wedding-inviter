import type { Lang } from "../../i18n";

export type RsvpStatus = "yes" | "no";

/** Shape of GET /api/guest/:code (see .claude-sdlc/outputs/05-api-schema.md). */
export type GuestView = {
  name: string;
  events: string[];
  rsvpStatus: RsvpStatus | null;
  defaultLang: Lang;
};

export type LocalizedText = { en: string; gu: string };

export type WeddingEvent = {
  slug: string;
  name: LocalizedText;
  startsAt: string;
  venue: LocalizedText;
  mapUrl: string;
  dressCode: LocalizedText;
  order: number;
};
