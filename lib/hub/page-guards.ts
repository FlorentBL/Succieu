import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { HUB_COOKIE, resolveHubUser } from "./session";
import { allowedModules } from "./access";
import { hasAccess, type HubUser } from "./users";
import { HUB_MODULES, type ModuleId } from "./modules";

export { allowedModules };

export const HUB_LOGIN_PATH = "/espace-bureau/connexion";

/** Utilisateur de la session, ou null (pages serveur ; les routes API utilisent guards.ts). */
export async function currentHubUser(): Promise<HubUser | null> {
  const jar = await cookies();
  return resolveHubUser(jar.get(HUB_COOKIE)?.value);
}

/** Page protégée : redirige vers la connexion. */
export async function requireHubPageUser(): Promise<HubUser> {
  const user = await currentHubUser();
  if (!user) redirect(HUB_LOGIN_PATH);
  return user;
}

/**
 * Garde d'une page de module : à appeler en tête de chaque page de module.
 * Renvoie l'utilisateur et son niveau (`read` ou `write`) ; 404 si le module est inconnu,
 * retour à l'accueil du hub s'il n'est pas autorisé.
 */
export async function requireModulePage(id: ModuleId): Promise<{ user: HubUser; level: "read" | "write" }> {
  if (!HUB_MODULES.some((m) => m.id === id)) notFound();
  const user = await requireHubPageUser();
  if (!hasAccess(user, id, "read")) redirect("/espace-bureau");
  return { user, level: hasAccess(user, id, "write") ? "write" : "read" };
}

/** Page de modération des saisies : réservée aux administrateurs (les autres retournent au module). */
export async function requireModerationPage(): Promise<HubUser> {
  const { user } = await requireModulePage("actus-agenda");
  if (user.role !== "admin") redirect("/espace-bureau/actualites");
  return user;
}
