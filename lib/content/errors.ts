export type ErrorCode =
  | "invalid_json"
  | "validation_failed"
  | "unauthorized"
  | "forbidden"
  | "bad_origin"
  | "rate_limited"
  | "not_found"
  | "invalid_transition"
  | "unsupported_media"
  | "payload_too_large"
  | "conflict"
  | "stale_revision"
  | "server_misconfigured"
  | "drive_sync_failed";

// "server_error" (500) est renvoyé pour toute erreur non prévue.

export const ERROR_STATUS: Record<ErrorCode, number> = {
  invalid_json: 400,
  validation_failed: 422,
  unauthorized: 401,
  forbidden: 403,
  bad_origin: 403,
  rate_limited: 429,
  not_found: 404,
  invalid_transition: 409,
  unsupported_media: 415,
  payload_too_large: 413,
  conflict: 409,
  stale_revision: 409,
  server_misconfigured: 500,
  drive_sync_failed: 502,
};

export class AppError extends Error {
  code: ErrorCode;
  fields?: Record<string, string>;
  retryAfter?: number;
  details?: Record<string, unknown>;
  constructor(
    code: ErrorCode,
    message: string,
    extra?: { fields?: Record<string, string>; retryAfter?: number; details?: Record<string, unknown> },
  ) {
    super(message);
    this.code = code;
    this.fields = extra?.fields;
    this.retryAfter = extra?.retryAfter;
    this.details = extra?.details;
  }
}
