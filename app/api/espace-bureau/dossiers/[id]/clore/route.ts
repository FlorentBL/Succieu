import { corps, route } from "@/lib/suivi/api";
import { clore } from "@/lib/suivi/model";
import { mutate } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

/** POST {abandon?: boolean, texte?: string} : termine (ou abandonne) le dossier et ajoute une nouvelle. */
export const POST = route<{ id: string }>("write", async (req, { acteur, ip }, { id }) => {
  const b = await corps(req);
  return mutate(
    acteur,
    (data) => {
      const d = clore(data, id, { abandon: b.abandon === true, texte: typeof b.texte === "string" ? b.texte : "" }, acteur);
      return { result: d, audit: [{ action: d.statut === "abandonne" ? "dossier_abandonne" : "dossier_clos", cible: id, detail: d.titre }] };
    },
    ip,
  );
});
