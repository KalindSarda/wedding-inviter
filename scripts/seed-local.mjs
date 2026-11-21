// Seeds the LOCAL D1 database (miniflare) with dummy guests and prints their links.
// Never touches a remote database: it only ever runs `wrangler d1 execute ... --local`.
//   npm run db:migrate:local && npm run db:seed:local
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { generateCode } from "../src/worker/lib/codes.ts";

const guests = [
  { name: "Rakesh Uncle & Family", headcount: 5, lang: "en", events: ["sangeet", "wedding"], rsvp: null },
  { name: "રમેશ કાકા અને પરિવાર", headcount: 4, lang: "gu", events: ["wedding", "reception"], rsvp: null },
  // Deliberately hostile name: must render as plain text everywhere.
  { name: "<script>alert(1)</script> & <b>Family</b>", headcount: 3, lang: "en", events: ["sangeet", "wedding", "reception"], rsvp: null },
  { name: "Meera Aunty", headcount: 2, lang: "gu", events: ["reception"], rsvp: "yes" },
];

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
let sql = "DELETE FROM guests;\n"; // cascades to guest_events and rsvp_log
const links = [];
for (const g of guests) {
  const code = generateCode();
  links.push({ code, name: g.name, events: g.events.join(",") });
  sql += `INSERT INTO guests (code, name, headcount, default_lang, rsvp_status, rsvp_updated_at) VALUES (${q(code)}, ${q(g.name)}, ${g.headcount}, ${q(g.lang)}, ${g.rsvp ? q(g.rsvp) : "NULL"}, ${g.rsvp ? "strftime('%Y-%m-%dT%H:%M:%fZ','now')" : "NULL"});\n`;
  for (const e of g.events) {
    sql += `INSERT INTO guest_events (guest_id, event_slug) VALUES ((SELECT id FROM guests WHERE code = ${q(code)}), ${q(e)});\n`;
  }
}

mkdirSync(new URL("./.generated", import.meta.url), { recursive: true });
const file = new URL("./.generated/seed.sql", import.meta.url);
writeFileSync(file, sql);

execFileSync("npx", ["wrangler", "d1", "execute", "wedding-invite", "--local", "--file", file.pathname.replace(/^\/([A-Za-z]:)/, "$1")], {
  stdio: "inherit",
  shell: true,
});

console.log("\nDummy guest links (local dev only):");
for (const l of links) console.log(`  http://localhost:8787/i/${l.code}   [${l.events}]`);
