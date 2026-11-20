import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { resolve } from "node:path";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(resolve(import.meta.dirname, "migrations"));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      }),
    ],
    test: {
      include: ["tests/**/*.test.ts"],
      setupFiles: ["./tests/apply-migrations.ts"],
    },
  };
});
