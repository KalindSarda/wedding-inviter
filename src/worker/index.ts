import { Hono } from "hono";

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Env }>();

// Phase 1: health check only. Guest/admin routes arrive in later phases.
app.get("/api/health", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ ok: true });
});

app.notFound((c) =>
  c.json({ error: { code: "not_found", message: "Not found." } }, 404),
);

app.onError((_err, c) =>
  // Never echo error details or PII.
  c.json({ error: { code: "internal", message: "Something went wrong." } }, 500),
);

export default app;
