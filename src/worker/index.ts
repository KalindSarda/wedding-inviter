import { Hono } from "hono";
import { securityHeaders } from "./middleware/security";
import { guestRoutes } from "./routes/guest";

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", securityHeaders);

app.get("/api/health", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ ok: true });
});

app.route("/api/guest", guestRoutes);

app.notFound((c) => c.json({ error: { code: "not_found", message: "Not found." } }, 404));

app.onError((err, c) => {
  // Log only the error class: messages can contain query text or user input (PII).
  console.error("unhandled_error", err.name);
  return c.json({ error: { code: "internal", message: "Something went wrong." } }, 500);
});

export default app;
