import { AppError } from "@/lib/content/errors";
import { corps, route } from "@/lib/suivi/api";
import { ajouterValeurListe, renommerValeurListe, supprimerValeurListe } from "@/lib/suivi/model";
import { mutate, readData } from "@/lib/suivi/store";
import type { Listes } from "@/lib/suivi/types";

export const dynamic = "force-dynamic";

export const GET = route("read", async () => (await readData()).listes);

/** POST {liste, valeur} ajoute · PATCH {liste, valeur, nouvelle} renomme · DELETE {liste, valeur} supprime. */
function action(nom: "ajout" | "renommage" | "suppression") {
  return route("write", async (req, { acteur, ip }) => {
    const b = await corps(req);
    const liste = String(b.liste ?? "") as keyof Listes;
    if (!["commissions", "decisionsAttendues", "blocages"].includes(liste)) {
      throw new AppError("validation_failed", "Liste inconnue (commissions, decisionsAttendues, blocages).");
    }
    const valeur = String(b.valeur ?? "");
    return mutate(
      acteur,
      (data) => {
        if (nom === "ajout") ajouterValeurListe(data, liste, valeur);
        else if (nom === "renommage") renommerValeurListe(data, liste, valeur, String(b.nouvelle ?? ""));
        else supprimerValeurListe(data, liste, valeur);
        return { result: data.listes, audit: [{ action: `liste_${nom}`, cible: liste, detail: nom === "renommage" ? `${valeur} → ${String(b.nouvelle)}` : valeur }] };
      },
      ip,
    );
  });
}

export const POST = action("ajout");
export const PATCH = action("renommage");
export const DELETE = action("suppression");
