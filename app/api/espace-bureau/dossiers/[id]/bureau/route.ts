import { corps, route } from "@/lib/suivi/api";
import { basculerBureau } from "@/lib/suivi/model";
import { mutate } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

/** POST {valeur?: boolean} : bascule (ou fixe) « à voir en bureau ». */
export const POST = route<{ id: string }>("write", async (req, { acteur, ip }, { id }) => {
  const b = await corps(req);
  return mutate(
    acteur,
    (data) => {
      const d = basculerBureau(data, id, typeof b.valeur === "boolean" ? b.valeur : undefined);
      return { result: d, audit: [{ action: "bureau_bascule", cible: id, detail: `${d.titre} — ${d.aVoirEnBureau ? "oui" : "non"}` }] };
    },
    ip,
  );
});
