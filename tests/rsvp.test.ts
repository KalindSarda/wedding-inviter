import { SELF, env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

const CODE = "7KQ3M9XPA4TW";

async function seed(rsvp: string | null = null) {
  await env.DB.prepare("DELETE FROM guests").run();
  await env.DB.prepare(
    "INSERT INTO guests (code, name, headcount, default_lang, rsvp_status) VALUES (?, 'Rakesh Uncle & Family', 7, 'gu', ?)",
  )
    .bind(CODE, rsvp)
    .run();
  const g = await env.DB.prepare("SELECT id FROM guests WHERE code = ?").bind(CODE).first<{ id: number }>();
  for (const e of ["wedding", "sangeet"]) {
    await env.DB.prepare("INSERT INTO guest_events (guest_id, event_slug) VALUES (?, ?)").bind(g!.id, e).run();
  }
  return g!.id;
}

const post = (code: string, body: unknown, init: { contentType?: string | null; raw?: string } = {}) =>
  SELF.fetch(`https://example.com/api/guest/${code}/rsvp`, {
    method: "POST",
    headers: init.contentType === null ? {} : { "Content-Type": init.contentType ?? "application/json" },
    body: init.raw ?? JSON.stringify(body),
  });

const getGuest = async (code = CODE) => (await SELF.fetch(`https://example.com/api/guest/${code}`)).json() as Promise<Record<string, unknown>>;

const logRows = (id: number) =>
  env.DB.prepare("SELECT status FROM rsvp_log WHERE guest_id = ? ORDER BY id").bind(id).all<{ status: string }>();

const state = (id: number) =>
  env.DB.prepare("SELECT rsvp_status, rsvp_updated_at, updated_at, headcount FROM guests WHERE id = ?")
    .bind(id)
    .first<{ rsvp_status: string | null; rsvp_updated_at: string | null; updated_at: string; headcount: number }>();

describe("POST /api/guest/:code/rsvp", () => {
  let id: number;
  beforeEach(async () => {
    id = await seed();
  });

  it("saves yes, stamps the time, and logs it", async () => {
    const res = await post(CODE, { status: "yes" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ rsvpStatus: "yes" });

    const s = await state(id);
    expect(s!.rsvp_status).toBe("yes");
    expect(s!.rsvp_updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect((await logRows(id)).results.map((r) => r.status)).toEqual(["yes"]);
  });

  it("saves no", async () => {
    expect(await (await post(CODE, { status: "no" })).json()).toEqual({ rsvpStatus: "no" });
    expect((await state(id))!.rsvp_status).toBe("no");
  });

  it("can be changed yes -> no -> yes and keeps the full history", async () => {
    for (const status of ["yes", "no", "yes"]) {
      expect((await post(CODE, { status })).status).toBe(200);
    }
    expect((await state(id))!.rsvp_status).toBe("yes");
    expect((await logRows(id)).results.map((r) => r.status)).toEqual(["yes", "no", "yes"]);
  });

  it("repeating the same answer writes nothing (no log row, timestamp unchanged)", async () => {
    await post(CODE, { status: "yes" });
    const before = await state(id);
    const res = await post(CODE, { status: "yes" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ rsvpStatus: "yes" });
    expect(await state(id)).toEqual(before);
    expect((await logRows(id)).results).toHaveLength(1);
  });

  it("never touches headcount", async () => {
    await post(CODE, { status: "no" });
    expect((await state(id))!.headcount).toBe(7);
  });

  it("is reflected by the guest GET, which still has exactly four keys", async () => {
    await post(CODE, { status: "yes" });
    const body = await getGuest();
    expect(Object.keys(body).sort()).toEqual(["defaultLang", "events", "name", "rsvpStatus"]);
    expect(body.rsvpStatus).toBe("yes");
  });

  it("removes the history with the guest (cascade)", async () => {
    await post(CODE, { status: "yes" });
    await env.DB.prepare("DELETE FROM guests WHERE id = ?").bind(id).run();
    expect((await logRows(id)).results).toHaveLength(0);
    expect((await post(CODE, { status: "yes" })).status).toBe(404);
  });

  describe("rejects bad input with the validation_failed envelope and writes nothing", () => {
    const cases: [string, () => Promise<Response>][] = [
      ["invalid status value", () => post(CODE, { status: "maybe" })],
      ["uppercase status", () => post(CODE, { status: "YES" })],
      ["missing status", () => post(CODE, {})],
      ["extra keys", () => post(CODE, { status: "yes", headcount: 99 })],
      ["status of wrong type", () => post(CODE, { status: true })],
      ["array body", () => post(CODE, ["yes"])],
      ["null body", () => post(CODE, null)],
      ["non-JSON body", () => post(CODE, null, { raw: "status=yes" })],
      ["empty body", () => post(CODE, null, { raw: "" })],
      ["form content type", () => post(CODE, null, { contentType: "application/x-www-form-urlencoded", raw: "status=yes" })],
      ["text/plain (cross-site form trick)", () => post(CODE, null, { contentType: "text/plain", raw: '{"status":"yes"}' })],
      ["no content type", () => post(CODE, null, { contentType: null, raw: '{"status":"yes"}' })],
    ];
    for (const [name, run] of cases) {
      it(name, async () => {
        const res = await run();
        expect(res.status).toBe(400);
        const body = (await res.json()) as { error: { code: string; message: string; details?: unknown } };
        expect(body.error.code).toBe("validation_failed");
        expect(JSON.stringify(body)).not.toContain("maybe"); // submitted values are never echoed
        const s = await state(id);
        expect(s!.rsvp_status).toBeNull();
        expect((await logRows(id)).results).toHaveLength(0);
      });
    }
  });

  it("returns 413 for oversized bodies", async () => {
    const res = await post(CODE, null, { raw: JSON.stringify({ status: "yes", pad: "x".repeat(5000) }) });
    expect(res.status).toBe(413);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("payload_too_large");
    expect((await state(id))!.rsvp_status).toBeNull();
  });

  it("gives the same generic 404 for unknown codes, whatever the body (no probing)", async () => {
    const getRes = await SELF.fetch("https://example.com/api/guest/ZZZZZZZZZZZZ");
    const expected = { status: getRes.status, body: await getRes.text() };
    const attempts = await Promise.all([
      post("ZZZZZZZZZZZZ", { status: "yes" }),
      post("ZZZZZZZZZZZZ", { status: "nonsense" }), // invalid body must not turn 404 into 400
      post("ZZZZZZZZZZZZ", null, { raw: "not json" }),
      post("short", { status: "yes" }),
      post("A".repeat(200), { status: "yes" }),
    ]);
    for (const res of attempts) {
      expect({ status: res.status, body: await res.text() }).toEqual(expected);
    }
    expect(expected.status).toBe(404);
  });

  it("does not let GET-only paths mutate state", async () => {
    await SELF.fetch(`https://example.com/api/guest/${CODE}/rsvp`); // GET on the rsvp path
    expect((await state(id))!.rsvp_status).toBeNull();
  });

  it("carries the security headers", async () => {
    const res = await post(CODE, { status: "yes" });
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("default-src 'self'");
  });
});
