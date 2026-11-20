import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("scaffold", () => {
  it("serves /api/health", async () => {
    const res = await SELF.fetch("https://example.com/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("returns the generic error envelope for unknown API routes", async () => {
    const res = await SELF.fetch("https://example.com/api/nope");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "not_found", message: "Not found." } });
  });

  it("applies the migration (tables exist, FK cascade works)", async () => {
    await env.DB.prepare(
      "INSERT INTO guests (code, name, headcount, default_lang) VALUES ('ABCDEFGHJK', 'Test', 2, 'en')",
    ).run();
    const g = await env.DB.prepare("SELECT id FROM guests WHERE code = 'ABCDEFGHJK'").first<{ id: number }>();
    await env.DB.prepare("INSERT INTO guest_events (guest_id, event_slug) VALUES (?, 'wedding')").bind(g!.id).run();
    await env.DB.prepare("INSERT INTO rsvp_log (guest_id, status) VALUES (?, 'yes')").bind(g!.id).run();
    await env.DB.prepare("DELETE FROM guests WHERE id = ?").bind(g!.id).run();
    const ev = await env.DB.prepare("SELECT COUNT(*) AS n FROM guest_events").first<{ n: number }>();
    const lg = await env.DB.prepare("SELECT COUNT(*) AS n FROM rsvp_log").first<{ n: number }>();
    expect(ev!.n).toBe(0);
    expect(lg!.n).toBe(0);
  });
});
