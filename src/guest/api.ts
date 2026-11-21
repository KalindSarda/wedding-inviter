import { isLang } from "../../i18n";
import type { GuestView, RsvpStatus } from "./types";

export type LoadResult =
  | { kind: "ok"; guest: GuestView }
  | { kind: "not_found" }
  | { kind: "error" };

/** The invitation code is the last path segment of /i/:code. */
export function codeFromPath(pathname: string): string | null {
  const m = /^\/i\/([^/]+)\/?$/.exec(pathname);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function isGuestView(v: unknown): v is GuestView {
  if (typeof v !== "object" || v === null) return false;
  const g = v as Record<string, unknown>;
  return (
    typeof g.name === "string" &&
    Array.isArray(g.events) &&
    g.events.every((e) => typeof e === "string") &&
    (g.rsvpStatus === null || g.rsvpStatus === "yes" || g.rsvpStatus === "no") &&
    isLang(g.defaultLang)
  );
}

export async function loadGuest(code: string): Promise<LoadResult> {
  try {
    const res = await fetch(`/api/guest/${encodeURIComponent(code)}`, { headers: { Accept: "application/json" } });
    if (res.status === 404) return { kind: "not_found" };
    if (!res.ok) return { kind: "error" };
    const body: unknown = await res.json();
    return isGuestView(body) ? { kind: "ok", guest: body } : { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}

export type { RsvpStatus };

/** Saves the guest's answer. Resolves true only when the server confirms the stored status. */
export async function postRsvp(code: string, status: RsvpStatus): Promise<boolean> {
  try {
    const res = await fetch(`/api/guest/${encodeURIComponent(code)}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { rsvpStatus?: unknown };
    return body.rsvpStatus === status;
  } catch {
    return false;
  }
}
