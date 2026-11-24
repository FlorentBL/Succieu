import { Filtres, ListeDossiers, Segment, appliquerPriorite, lireRecherche, resumeFiltres } from "@/components/suivi/Liste";
import { requireModulePage } from "@/lib/hub/page-guards";
import { filtrerDossiers } from "@/lib/suivi/model";
import { lireNoms, readData } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

export default async function MesDossiers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { user } = await requireModulePage("espace-bureau");
  const [data, { noms }] = await Promise.all([readData(), lireNoms()]);
  const r = lireRecherche(await searchParams);
  const nb = filtrerDossiers(data, { referent: user.id }).length;
  const nbTous = filtrerDossiers(data).length;
  const dossiers = appliquerPriorite(filtrerDossiers(data, { referent: user.id, commission: r.commission || undefined, q: r.q }, noms), r.priorite);
  return (
    <>
      <h2 className="sr-only">Mes dossiers</h2>
      <div className="mb-4 grid gap-3">
        <div><Segment actif="mes" nb={nb} nbTous={nbTous} /></div>
        <Filtres listes={data.listes} action="/espace-bureau/bureau" valeurs={r} />
      </div>
      <ListeDossiers resume={resumeFiltres(r)} dossiers={dossiers} noms={noms} vide="Aucun dossier ne correspond. Vous pouvez changer la recherche, ou regarder « Tous les dossiers »." />
    </>
  );
}
