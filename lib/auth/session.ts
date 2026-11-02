import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../content/errors";

export type SessionRole = "bureau" | "admin";
export type Session = { role: SessionRole; name: string; exp: number };

export const SESSION_TTL_SECONDS = 8 * 3600;
export const COOKIE_NAMES: Record<SessionRole, string> = {
  bureau: "succieu_bureau",
  admin: "succieu_admin",
};

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new AppError("server_misconfigured", "SESSION_SECRET absent ou trop court (32 caractères minimum).");
  }
  return s;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Jeton : base64url(JSON).signature HMAC-SHA256. */
export function createSessionToken(
  role: SessionRole,
  name: string,
  now = Date.now(),
  key = secret(),
): string {
  const session: Session = { role, name, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifySessionToken(
  token: string | undefined,
  role: SessionRole,
  now = Date.now(),
  key = secret(),
): Session | null {
  if (!token) return null;
  const [payload, sig, ...rest] = token.split(".");
  if (!payload || !sig || rest.length) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (s.role !== role || typeof s.name !== "string" || typeof s.exp !== "number") return null;
    if (s.exp * 1000 <= now) return null;
    return s;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
