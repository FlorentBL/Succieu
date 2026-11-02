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
  | "server_misconfigured";

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
  server_misconfigured: 500,
};

export class AppError extends Error {
  code: ErrorCode;
  fields?: Record<string, string>;
  retryAfter?: number;
  constructor(
    code: ErrorCode,
    message: string,
    extra?: { fields?: Record<string, string>; retryAfter?: number },
  ) {
    super(message);
    this.code = code;
    this.fields = extra?.fields;
    this.retryAfter = extra?.retryAfter;
  }
}
