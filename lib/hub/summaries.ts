import type { HubUser } from "./users";
import type { ModuleId } from "./modules";
import { filtrerDossiers } from "../suivi/model";
import { readData } from "../suivi/store";

/**
 * Résumé court affiché sur la tuile d'un module (ex. « 2 saisies à traiter »).
 * Chaque volet l'enregistre ici ; renvoyer null masque l'emplacement.
 */
export type ModuleSummary = (user: HubUser) => Promise<string | null>;

export const MODULE_SUMMARIES: Partial<Record<ModuleId, ModuleSummary>> = {
  "espace-bureau": async (user) => {
    const n = filtrerDossiers(await readData(), { referent: user.id }).length;
    return n === 0 ? null : n === 1 ? "1 dossier dont vous êtes référent" : `${n} dossiers dont vous êtes référent`;
  },
};

export async function summaryFor(id: ModuleId, user: HubUser): Promise<string | null> {
  try {
    return (await MODULE_SUMMARIES[id]?.(user)) ?? null;
  } catch {
    return null; // un résumé en échec ne doit jamais casser l'accueil
  }
}
