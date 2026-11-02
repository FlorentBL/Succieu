import { NextResponse } from "next/server";
import { AppError, ERROR_STATUS } from "../content/errors";

export function ok(data: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof AppError) {
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (e.retryAfter) headers["Retry-After"] = String(e.retryAfter);
    return NextResponse.json(
      { error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}) } },
      { status: ERROR_STATUS[e.code], headers },
    );
  }
  console.error(e);
  return NextResponse.json(
    { error: { code: "server_error", message: "Erreur interne." } },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function readJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("invalid_json", "Corps JSON invalide.");
  }
}

type Handler<C> = (req: Request, ctx: C) => Promise<NextResponse>;

/** Enveloppe : erreurs normalisées. */
export function handle<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}
