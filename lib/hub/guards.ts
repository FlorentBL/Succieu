import { cookies } from "next/headers";
import { assertSameOrigin } from "../auth/origin";
import { checkAdmin, checkModule, checkUser } from "./access";
import { HUB_COOKIE, resolveHubUser } from "./session";
import type { HubUser } from "./users";
import type { ModuleId } from "./modules";

async function current(): Promise<HubUser | null> {
  const jar = await cookies();
  return resolveHubUser(jar.get(HUB_COOKIE)?.value);
}

/**
 * Utilisateur connecté. Refuse (403 password_change_required) tant que le mot
 * de passe est provisoire, sauf `allowPasswordChange` (session, password, logout).
 */
export async function requireUser(opts: { allowPasswordChange?: boolean } = {}): Promise<HubUser> {
  return checkUser(await current(), opts);
}

export async function requireAdmin(): Promise<HubUser> {
  return checkAdmin(await current());
}

/** Les écritures (`write`) exigent aussi l'origine : passer `req`. */
export async function requireModule(module: ModuleId, level: "read" | "write", req?: Request): Promise<HubUser> {
  if (level === "write" && req) assertSameOrigin(req);
  return checkModule(await current(), module, level);
}
