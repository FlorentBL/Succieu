import { route } from "@/lib/suivi/api";
import { rouvrir } from "@/lib/suivi/model";
import { mutate } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

export const POST = route<{ id: string }>("write", async (_req, { acteur, ip }, { id }) =>
  mutate(
    acteur,
    (data) => {
      const d = rouvrir(data, id, acteur);
      return { result: d, audit: [{ action: "dossier_rouvert", cible: id, detail: d.titre }] };
    },
    ip,
  ),
);
