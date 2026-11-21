// Writes dist/client/_headers from the Worker's SECURITY_HEADERS, so static files (HTML shells, JS, CSS,
// fonts), which Cloudflare serves *before* the Worker runs, get exactly the same security headers as API
// responses. Single source of truth: src/worker/middleware/security.ts.
import { writeFileSync } from "node:fs";
import { SECURITY_HEADERS } from "../src/worker/middleware/security.ts";

let out = "/*\n";
for (const [k, v] of Object.entries(SECURITY_HEADERS)) out += `  ${k}: ${v}\n`;
// Vite fingerprints everything under /assets, so it can be cached forever.
out += "\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n";

writeFileSync(new URL("../dist/client/_headers", import.meta.url), out);
console.log("wrote dist/client/_headers");
