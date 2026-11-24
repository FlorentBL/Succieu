import { AppError } from "@/lib/content/errors";
import { corps, route } from "@/lib/suivi/api";
import { modifierDossier, trouverDossier } from "@/lib/suivi/model";
import { lireNoms, mutate, readData } from "@/lib/suivi/store";
import type { DossierInput } from "@/lib/suivi/types";

export const dynamic = "force-dynamic";

export const GET = route<{ id: string }>("read", async (_req, _ctx, { id }) => trouverDossier(await readData(), id));

/** PATCH : champs à modifier ; `revision` (facultatif) détecte une modification concurrente (409 invalid_transition). */
export const PATCH = route<{ id: string }>("write", async (req, { acteur, ip }, { id }) => {
  const { revision, ...input } = await corps(req);
  if (revision !== undefined && typeof revision !== "number") throw new AppError("validation_failed", "revision : nombre attendu.");
  const { noms } = await lireNoms();
  return mutate(
    acteur,
    (data) => {
      const { dossier, champs } = modifierDossier(data, id, input as DossierInput, revision as number | undefined, noms);
      return { result: dossier, audit: [{ action: "dossier_modifie", cible: id, detail: `${dossier.titre} — ${champs.join(", ")}` }] };
    },
    ip,
  );
});
