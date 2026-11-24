import Link from "next/link";
import { Filtres, Segment, appliquerPriorite, lireRecherche, resumeFiltres } from "@/components/suivi/Liste";
import { Tableau } from "@/components/suivi/Tableau";
import type { CarteTableau } from "@/components/suivi/Tableau";
import { requireModulePage } from "@/lib/hub/page-guards";
import { aujourdhui, enRetard, nomsReferents } from "@/lib/suivi/affichage";
import { filtrerDossiers } from "@/lib/suivi/model";
import { lireNoms, readData } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

const BASE = "/espace-bureau/bureau/tableau";

/** Vue Kanban : colonnes = avancement. « Mes dossiers » par défaut ; `?tous=1` pour tous. Mêmes filtres que la liste. */
export default async function PageTableau({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user, level } = await requireModulePage("espace-bureau");
  const [data, { noms }] = await Promise.all([readData(), lireNoms()]);
  const sp = await searchParams;
  const r = lireRecherche(sp);
  const tous = sp.tous === "1";
  const nb = filtrerDossiers(data, { referent: user.id }).length;
  const nbTous = filtrerDossiers(data).length;
  const today = aujourdhui();
  const dossiers = appliquerPriorite(filtrerDossiers(data, { referent: tous ? undefined : user.id, commission: r.commission || undefined, q: r.q }, noms), r.priorite);
  const cartes: CarteTableau[] = dossiers.map((d) => ({
    id: d.id,
    titre: d.titre,
    priorite: d.priorite,
    avancement: d.avancement,
    echeance: d.echeance,
    referents: nomsReferents(d, noms),
    retard: enRetard(d, today),
    aVoirEnBureau: d.aVoirEnBureau,
    revision: d.revision,
  }));
  return (
    <>
      <h2 className="sr-only">Tableau des dossiers par avancement</h2>
      <div className="mb-3 grid gap-3">
        <div><Segment actif={tous ? "tous" : "mes"} nb={nb} nbTous={nbTous} liens={{ mes: BASE, tous: `${BASE}?tous=1` }} /></div>
        <Filtres listes={data.listes} action={BASE} valeurs={r} cache={tous ? { tous: "1" } : undefined} />
      </div>
      <p className="text-[0.95rem] text-ink-muted">
        {resumeFiltres(r) || (tous ? "Tous les dossiers en cours" : "Mes dossiers en cours")} ·{" "}
        <Link href="/espace-bureau/bureau/termines" className="font-semibold text-moss-dark underline">Voir les terminés</Link>
      </p>
      <Tableau cartes={cartes} lecture={level === "read"} />
    </>
  );
}
