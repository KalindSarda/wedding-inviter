import raw from "../../../config/events.json";

export type EventConfig = {
  slug: string;
  order: number;
};

const events = (raw as EventConfig[]).slice().sort((a, b) => a.order - b.order);

/** Event slugs in display order (config/events.json is the single source of event content). */
export const EVENT_SLUGS_ORDERED: readonly string[] = events.map((e) => e.slug);
export const EVENT_SLUGS: ReadonlySet<string> = new Set(EVENT_SLUGS_ORDERED);

/** Keep only slugs that still exist in config, in config order (a removed event silently disappears). */
export function orderKnownSlugs(slugs: Iterable<string>): string[] {
  const have = new Set(slugs);
  return EVENT_SLUGS_ORDERED.filter((s) => have.has(s));
}
