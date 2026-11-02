import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { AppError } from "../content/errors";
import { isBureauMember } from "../content/bureau";
import { COOKIE_NAMES, verifySessionToken, type Session, type SessionRole } from "./session";

async function sessionOf(role: SessionRole): Promise<Session | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE_NAMES[role])?.value, role);
}

/**
 * Session du bureau après le mot de passe. Le nom est vide tant que le membre
 * ne l'a pas choisi (étape 2 de la connexion).
 */
export async function getBureauAccess(): Promise<Session | null> {
  const s = await sessionOf("bureau");
  if (!s) return null;
  // un nom retiré de bureau.json perd immédiatement l'accès
  return s.name === "" || (await isBureauMember(s.name)) ? s : null;
}

/** Session du bureau avec un nom choisi : nécessaire pour saisir et consulter l'historique. */
export async function getBureauSession(): Promise<Session | null> {
  const s = await getBureauAccess();
  return s && s.name !== "" ? s : null;
}

export const getAdminSession = () => sessionOf("admin");

export async function requireBureau(): Promise<Session> {
  const s = await getBureauSession();
  if (!s) throw new AppError("unauthorized", "Connexion du bureau requise.");
  return s;
}

/** Mot de passe validé, nom pas forcément choisi (liste des noms, choix du nom). */
export async function requireBureauAccess(): Promise<Session> {
  const s = await getBureauAccess();
  if (!s) throw new AppError("unauthorized", "Connexion du bureau requise.");
  return s;
}

export async function requireAdmin(): Promise<Session> {
  const s = await getAdminSession();
  if (!s) throw new AppError("unauthorized", "Connexion administrateur requise.");
  return s;
}

/** Authorization: Bearer <REVIEW_API_TOKEN> pour l'agent de relecture. */
export function requireReviewToken(req: Request): void {
  const expected = process.env.REVIEW_API_TOKEN;
  if (!expected || expected.length < 24) {
    throw new AppError("server_misconfigured", "REVIEW_API_TOKEN absent ou trop court.");
  }
  const m = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "");
  const given = Buffer.from(m?.[1] ?? "");
  const exp = Buffer.from(expected);
  if (given.length !== exp.length || !timingSafeEqual(given, exp)) {
    throw new AppError("unauthorized", "Jeton de relecture invalide.");
  }
}
