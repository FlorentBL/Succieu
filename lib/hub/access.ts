import { AppError } from "../content/errors";
import { effectiveRights, hasAccess, type HubUser } from "./users";
import { HUB_MODULES, type AccessLevel, type HubModule, type ModuleId } from "./modules";

/** Contrôle de session, sans accès aux cookies (testable). */
export function checkUser(user: HubUser | null): HubUser {
  if (!user) throw new AppError("unauthorized", "Connexion requise.");
  return user;
}

export function checkAdmin(user: HubUser | null): HubUser {
  const u = checkUser(user);
  if (u.role !== "admin") throw new AppError("forbidden", "Réservé aux administrateurs.");
  return u;
}

export function checkModule(user: HubUser | null, module: ModuleId, level: "read" | "write"): HubUser {
  const u = checkUser(user);
  if (!hasAccess(u, module, level)) throw new AppError("forbidden", "Droits insuffisants pour ce module.");
  return u;
}


/** Modules visibles par l'utilisateur (niveau ≥ lecture), dans l'ordre du registre. */
export function allowedModules(user: Pick<HubUser, "role" | "rights">): (HubModule & { level: Exclude<AccessLevel, "none"> })[] {
  const rights = effectiveRights(user);
  return HUB_MODULES.flatMap((m) => {
    const level = rights[m.id];
    return level === "none" ? [] : [{ ...m, level }];
  });
}

