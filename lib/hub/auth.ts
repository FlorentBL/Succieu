import { AppError } from "../content/errors";
import { assertSameOrigin, clientIp } from "../auth/origin";
import { hashPassword, verifyPassword } from "../auth/password";
import { clearFailures, recordFailure, retryAfter } from "../auth/rate-limit";
import { audit } from "./audit";
import { createHubToken } from "./session";
import {
  MAX_PASSWORD_LENGTH,
  effectiveRights,
  getUserByIdentifier,
  normalizeIdentifier,
  type HubUser,
} from "./users";

let dummyHash: Promise<string> | undefined;

/** Identité renvoyée au navigateur (jamais d'empreinte). */
export function sessionBody(u: HubUser) {
  return {
    authenticated: true as const,
    user: { id: u.id, identifier: u.identifier, displayName: u.displayName },
    role: u.role,
    rights: effectiveRights(u),
  };
}

function blockedFor(keys: string[]): number {
  return Math.max(...keys.map((k) => retryAfter(k)));
}

/** POST /api/hub/login : origine, limitation IP + identifiant, mot de passe, cookie. */
export async function hubLogin(
  req: Request,
  identifier: unknown,
  password: unknown,
): Promise<{ user: HubUser; token: string }> {
  assertSameOrigin(req);
  const ip = clientIp(req.headers);
  const id = typeof identifier === "string" ? normalizeIdentifier(identifier).slice(0, 64) : "";
  const keys = [`hub-ip:${ip}`, `hub-id:${id}`];
  const wait = blockedFor(keys);
  if (wait > 0) {
    await audit({ actor: id || "?", action: "login.blocked", ip });
    throw new AppError("rate_limited", "Trop de tentatives, réessayez plus tard.", { retryAfter: wait });
  }
  const user = id ? await getUserByIdentifier(id) : null;
  const valid = typeof password === "string" && password.length > 0 && password.length <= MAX_PASSWORD_LENGTH;
  // même coût que l'identifiant existe ou non
  dummyHash ??= hashPassword("dummy-password-for-timing");
  const passOk = valid ? await verifyPassword(password as string, user?.passwordHash ?? (await dummyHash)) : false;
  if (!user || !user.active || !passOk) {
    keys.forEach((k) => recordFailure(k));
    await audit({ actor: id || "?", action: "login.failed", ip });
    throw new AppError("unauthorized", "Identifiant ou mot de passe incorrect.");
  }
  clearFailures(keys[1]);
  await audit({ actor: user.identifier, action: "login.ok", ip });
  return { user, token: createHubToken(user) };
}
