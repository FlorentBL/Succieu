import { AppError } from "../content/errors";
import { hasAccess, type HubUser } from "./users";
import type { ModuleId } from "./modules";

/** Contrôle de session + mustChangePassword, sans accès aux cookies (testable). */
export function checkUser(user: HubUser | null, opts: { allowPasswordChange?: boolean } = {}): HubUser {
  if (!user) throw new AppError("unauthorized", "Connexion requise.");
  if (user.mustChangePassword && !opts.allowPasswordChange) {
    throw new AppError("password_change_required", "Vous devez d'abord changer votre mot de passe.");
  }
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

