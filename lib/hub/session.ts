import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../content/errors";
import { getUserById, type HubUser } from "./users";

export const HUB_COOKIE = "succieu_hub";
export const DEFAULT_SESSION_HOURS = 2160; // 90 jours

export type HubToken = { uid: string; pv: number; exp: number };

export function sessionSeconds(): number {
  const h = Number(process.env.HUB_SESSION_HOURS);
  return (Number.isFinite(h) && h > 0 ? h : DEFAULT_SESSION_HOURS) * 3600;
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new AppError("server_misconfigured", "SESSION_SECRET absent ou trop court (32 caractères minimum).");
  }
  return s;
}

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

/** Jeton : base64url(JSON).HMAC-SHA256. Porte la version du mot de passe. */
export function createHubToken(user: Pick<HubUser, "id" | "passwordVersion">, now = Date.now(), key = secret()): string {
  const t: HubToken = { uid: user.id, pv: user.passwordVersion, exp: Math.floor(now / 1000) + sessionSeconds() };
  const payload = Buffer.from(JSON.stringify(t)).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifyHubToken(token: string | undefined, now = Date.now(), key = secret()): HubToken | null {
  if (!token) return null;
  const [payload, sig, ...rest] = token.split(".");
  if (!payload || !sig || rest.length) return null;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const t = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as HubToken;
    if (typeof t.uid !== "string" || typeof t.pv !== "number" || typeof t.exp !== "number") return null;
    if (t.exp * 1000 <= now) return null;
    return t;
  } catch {
    return null;
  }
}

/** Jeton valide ET compte actif ET version du mot de passe inchangée. */
export async function resolveHubUser(token: string | undefined, now = Date.now()): Promise<HubUser | null> {
  const t = verifyHubToken(token, now);
  if (!t) return null;
  const user = await getUserById(t.uid);
  if (!user || !user.active || user.passwordVersion !== t.pv) return null;
  return user;
}

/** SameSite=Lax : Strict casse l'ouverture depuis un lien WhatsApp (voir docs/espace-bureau.md). */
export function hubCookieOptions(maxAge = sessionSeconds()) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
