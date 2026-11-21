import type { GuestView } from "./types";

// Phase 2 only: dummy data. Replaced by GET /api/guest/:code in Phase 3.
// Try `?mock=gu` or `?mock=xss` in the URL to preview other cases.
const variants: Record<string, GuestView> = {
  default: {
    name: "Rakesh Uncle & Family",
    events: ["sangeet", "wedding"],
    rsvpStatus: null,
    defaultLang: "en",
  },
  gu: {
    name: "રમેશ કાકા અને પરિવાર",
    events: ["wedding", "reception"],
    rsvpStatus: null,
    defaultLang: "gu",
  },
  xss: {
    name: "<script>alert(1)</script> & <b>Family</b>",
    events: ["sangeet", "wedding", "reception"],
    rsvpStatus: null,
    defaultLang: "en",
  },
};

export function getMockGuest(): GuestView {
  const key = new URLSearchParams(window.location.search).get("mock") ?? "default";
  return variants[key] ?? variants.default!;
}
