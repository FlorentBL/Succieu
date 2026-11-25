import { cookies } from "next/headers";
import { assertSameOrigin } from "../auth/origin";
import { checkAdmin, checkModerator, checkModule, checkUser } from "./access";
import { HUB_COOKIE, resolveHubUser } from "./session";
import type { HubUser } from "./users";
import type { ModuleId } from "./modules";

async function current(): Promise<HubUser | null> {
  const jar = await cookies();
  return resolveHubUser(jar.get(HUB_COOKIE)?.value);
}

/** Utilisateur connecté (401 sinon). */
export async function requireUser(): Promise<HubUser> {
  return checkUser(await current());
}

export async function requireAdmin(): Promise<HubUser> {
  return checkAdmin(await current());
}

/** Administrateur ou personne autorisée à modérer (routes /api/admin/submissions* uniquement). */
export async function requireModerator(): Promise<HubUser> {
  return checkModerator(await current());
}

/** Les écritures (`write`) exigent aussi l'origine : passer `req`. */
export async function requireModule(module: ModuleId, level: "read" | "write", req?: Request): Promise<HubUser> {
  if (level === "write" && req) assertSameOrigin(req);
  return checkModule(await current(), module, level);
}
