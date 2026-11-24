import { corps, route } from "@/lib/suivi/api";
import { ajouterNouvelle, trouverDossier } from "@/lib/suivi/model";
import { mutate } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

/** POST {texte} : ajoute une nouvelle ; l'auteur est le compte connecté. */
export const POST = route<{ id: string }>("write", async (req, { acteur, ip }, { id }) => {
  const b = await corps(req);
  const n = await mutate(
    acteur,
    (data) => {
      const nouvelle = ajouterNouvelle(data, id, String(b.texte ?? ""), acteur);
      return { result: nouvelle, audit: [{ action: "nouvelle_ajoutee", cible: id, detail: trouverDossier(data, id).titre }] };
    },
    ip,
  );
  return Response.json(n, { status: 201, headers: { "Cache-Control": "no-store" } });
});
