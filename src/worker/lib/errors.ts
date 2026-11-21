// Single error envelope for every non-2xx response (see .claude-sdlc/outputs/05-api-schema.md).
export type ErrorCode =
  | "not_found"
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "conflict"
  | "payload_too_large"
  | "internal";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  extra: { details?: { path: string; message: string }[]; retryAfterSeconds?: number } = {},
): Response {
  return new Response(JSON.stringify({ error: { code, message, ...extra } }), { status, headers: JSON_HEADERS });
}

/**
 * Unknown, malformed and deleted guest codes all produce this exact response, so nothing about
 * code validity or format is revealed (on both GET and POST).
 */
export function guestNotFound(): Response {
  return errorResponse(404, "not_found", "Invitation not found.");
}

export function validationFailed(details: { path: string; message: string }[] = []): Response {
  return errorResponse(400, "validation_failed", "Invalid request.", details.length ? { details } : {});
}
