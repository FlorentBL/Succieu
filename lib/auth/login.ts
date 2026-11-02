import { NextResponse } from "next/server";
import { AppError } from "../content/errors";
import { clearFailures, recordFailure, retryAfter } from "./rate-limit";
import { assertSameOrigin, clientIp } from "./origin";
import { verifyPassword } from "./password";
import { COOKIE_NAMES, cookieOptions, createSessionToken, type SessionRole } from "./session";
import { ok } from "./http";

/** Vérifie origine, limitation, mot de passe ; pose le cookie de session. */
export async function login(
  req: Request,
  role: SessionRole,
  name: string,
  password: unknown,
  hashEnv: "BUREAU_PASSWORD_HASH" | "ADMIN_PASSWORD_HASH",
  nameAllowed = true,
): Promise<NextResponse> {
  assertSameOrigin(req);
  const hash = process.env[hashEnv];
  if (!hash) throw new AppError("server_misconfigured", `${hashEnv} non configuré.`);
  const key = clientIp(req.headers);
  const wait = retryAfter(key);
  if (wait > 0) {
    throw new AppError("rate_limited", "Trop de tentatives, réessayez plus tard.", { retryAfter: wait });
  }
  const valid =
    typeof password === "string" && password.length > 0 && password.length <= 200
      ? await verifyPassword(password, hash)
      : false;
  if (!valid || !nameAllowed) {
    recordFailure(key);
    throw new AppError("unauthorized", "Mot de passe incorrect.");
  }
  clearFailures(key);
  const res = ok({ ok: true, role, name });
  res.cookies.set(COOKIE_NAMES[role], createSessionToken(role, name), cookieOptions());
  return res;
}

export function logout(req: Request, role: SessionRole): NextResponse {
  assertSameOrigin(req);
  const res = ok({ ok: true });
  res.cookies.set(COOKIE_NAMES[role], "", cookieOptions(0));
  return res;
}
