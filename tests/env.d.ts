import type { D1Migration } from "cloudflare:test";

// `env` from "cloudflare:test" is typed as `Cloudflare.Env`; give it our bindings.
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      ASSETS: Fetcher;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
