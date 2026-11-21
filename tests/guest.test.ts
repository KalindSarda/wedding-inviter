import { SELF, env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { CODE_ALPHABET, CODE_LENGTH, generateCode } from "../src/worker/lib/codes";
import { GuestCode } from "../src/worker/lib/validation";

const CODE = "7KQ3M9XPA4TW";
const HEADCOUNT = 7;

async function seed(opts: { name?: string; events?: string[]; lang?: string; rsvp?: string | null } = {}) {
  await env.DB.prepare("DELETE FROM guests").run();
  await env.DB.prepare(
    "INSERT INTO guests (code, name, headcount, default_lang, rsvp_status) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(CODE, opts.name ?? "Rakesh Uncle & Family", HEADCOUNT, opts.lang ?? "gu", opts.rsvp ?? null)
    .run();
  const g = await env.DB.prepare("SELECT id FROM guests WHERE code = ?").bind(CODE).first<{ id: number }>();
  for (const e of opts.events ?? ["wedding", "sangeet"]) {
    await env.DB.prepare("INSERT INTO guest_events (guest_id, event_slug) VALUES (?, ?)").bind(g!.id, e).run();
  }
  return g!.id;
}

const get = (code: string) => SELF.fetch(`https://example.com/api/guest/${code}`);

describe("GET /api/guest/:code", () => {
  beforeEach(async () => {
    await seed();
  });

  it("returns exactly name/events/rsvpStatus/defaultLang (headcount-privacy)", async () => {
    const res = await get(CODE);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["defaultLang", "events", "name", "rsvpStatus"]);
    expect(body).toEqual({
      name: "Rakesh Uncle & Family",
      events: ["sangeet", "wedding"], // config order, not insertion order
      rsvpStatus: null,
      defaultLang: "gu",
    });
    // Belt and braces: nothing in the raw text hints at headcount, id or the code itself.
    const raw = JSON.stringify(body);
    expect(raw).not.toMatch(/headcount|"id"|"code"/i);
    expect(raw).not.toContain(CODE);
  });

  it("is not cacheable and carries security headers", async () => {
    const res = await get(CODE);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(res.headers.get("strict-transport-security")).toBeTruthy();
  });

  it("reports the stored RSVP status", async () => {
    await seed({ rsvp: "yes" });
    const body = (await (await get(CODE)).json()) as { rsvpStatus: string };
    expect(body.rsvpStatus).toBe("yes");
  });

  it("drops events that no longer exist in config", async () => {
    await seed({ events: ["wedding", "removed-event"] });
    const body = (await (await get(CODE)).json()) as { events: string[] };
    expect(body.events).toEqual(["wedding"]);
  });

  it("returns a hostile name verbatim as JSON data (escaping happens at render)", async () => {
    await seed({ name: "<script>alert(1)</script> & <b>x</b>" });
    const res = await get(CODE);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = (await res.json()) as { name: string };
    expect(body.name).toBe("<script>alert(1)</script> & <b>x</b>");
  });

  it("gives identical status and body for unknown, malformed and deleted codes", async () => {
    const id = await seed();
    await env.DB.prepare("DELETE FROM guests WHERE id = ?").bind(id).run();

    const attempts = [
      "ZZZZZZZZZZZZ", // well-formed, unknown
      "short", // malformed
      "0O1Il-bad-chars", // malformed alphabet
      CODE, // valid format, but now deleted
      "A".repeat(200), // absurdly long
      "%27%20OR%201%3D1--", // injection attempt
    ];
    const results = await Promise.all(
      attempts.map(async (c) => {
        const res = await get(c);
        return { status: res.status, body: await res.text(), cc: res.headers.get("cache-control") };
      }),
    );
    for (const r of results) {
      expect(r.status).toBe(404);
      expect(r).toEqual(results[0]);
    }
    expect(JSON.parse(results[0]!.body)).toEqual({
      error: { code: "not_found", message: "Invitation not found." },
    });
  });

  it("deleting a guest removes their events (link stops working)", async () => {
    const id = await seed();
    await env.DB.prepare("DELETE FROM guests WHERE id = ?").bind(id).run();
    const left = await env.DB.prepare("SELECT COUNT(*) AS n FROM guest_events").first<{ n: number }>();
    expect(left!.n).toBe(0);
    expect((await get(CODE)).status).toBe(404);
  });
});

describe("guest codes", () => {
  it("have the right length and alphabet, and pass the code schema", () => {
    for (let i = 0; i < 500; i++) {
      const c = generateCode();
      expect(c).toHaveLength(CODE_LENGTH);
      expect([...c].every((ch) => CODE_ALPHABET.includes(ch))).toBe(true);
      expect(GuestCode.safeParse(c).success).toBe(true);
    }
  });

  it("never use look-alike characters", () => {
    expect(CODE_ALPHABET).not.toMatch(/[01ILO]/);
    expect(new Set(CODE_ALPHABET).size).toBe(CODE_ALPHABET.length);
  });

  it("are unique across 10,000 generated codes and not sequential", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) seen.add(generateCode());
    expect(seen.size).toBe(10_000);
    // Rough uniformity check: every symbol appears and none dominates.
    const counts = new Map<string, number>();
    for (const c of seen) for (const ch of c) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    expect(counts.size).toBe(CODE_ALPHABET.length);
    const total = 10_000 * CODE_LENGTH;
    const expected = total / CODE_ALPHABET.length;
    for (const n of counts.values()) expect(Math.abs(n - expected) / expected).toBeLessThan(0.1);
  });
});
