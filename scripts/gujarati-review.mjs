// Regenerates docs/gujarati-review.md: English vs Gujarati side by side, for owner review.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const en = read("i18n/en.json");
const gu = read("i18n/gu.json");
const events = read("config/events.json");
const esc = (s) => String(s).replace(/\|/g, "\|");

let md = `# Gujarati draft: review sheet

**Status: DRAFT, written by Claude at the owner's request, NOT yet reviewed by a Gujarati speaker.**
Edit \`i18n/gu.json\` and the \`gu\` fields in \`config/events.json\` directly; this table is only a side-by-side aid.
Regenerate it with \`node scripts/gujarati-review.mjs\`.

Check: tone and humour (jokes do not translate literally), form of address (તમે vs આપ), spelling, and the couple names (dummy).

## UI strings

| Key | English | Gujarati draft |
|---|---|---|
`;
for (const k of Object.keys(en)) md += `| \`${k}\` | ${esc(en[k])} | ${esc(gu[k] ?? "MISSING")} |\n`;
md += `\n## Events (config/events.json)\n\n| Slug | Field | English | Gujarati |\n|---|---|---|---|\n`;
for (const e of events) for (const f of ["name", "venue", "dressCode"]) md += `| ${e.slug} | ${f} | ${esc(e[f].en)} | ${esc(e[f].gu)} |\n`;

mkdirSync(new URL("../docs", import.meta.url), { recursive: true });
writeFileSync(new URL("../docs/gujarati-review.md", import.meta.url), md);
console.log("wrote docs/gujarati-review.md");
