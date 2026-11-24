import type { HubUser } from "./users";
import type { ModuleId } from "./modules";

/**
 * Résumé court affiché sur la tuile d'un module (ex. « 2 saisies à traiter »).
 * Chaque volet l'enregistre ici ; renvoyer null masque l'emplacement.
 */
export type ModuleSummary = (user: HubUser) => Promise<string | null>;

export const MODULE_SUMMARIES: Partial<Record<ModuleId, ModuleSummary>> = {};

export async function summaryFor(id: ModuleId, user: HubUser): Promise<string | null> {
  try {
    return (await MODULE_SUMMARIES[id]?.(user)) ?? null;
  } catch {
    return null; // un résumé en échec ne doit jamais casser l'accueil
  }
}
