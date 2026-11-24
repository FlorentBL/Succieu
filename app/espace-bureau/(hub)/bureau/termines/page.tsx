import { Filtres, ListeDossiers, appliquerPriorite, lireRecherche, resumeFiltres } from "@/components/suivi/Liste";
import { requireModulePage } from "@/lib/hub/page-guards";
import { filtrerDossiers } from "@/lib/suivi/model";
import { lireNoms, readData } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

export default async function Termines({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireModulePage("espace-bureau");
  const [data, { noms }] = await Promise.all([readData(), lireNoms()]);
  const r = lireRecherche(await searchParams);
  const f = { commission: r.commission || undefined, q: r.q };
  const dossiers = appliquerPriorite([...filtrerDossiers(data, { statut: "termine", ...f }, noms), ...filtrerDossiers(data, { statut: "abandonne", ...f }, noms)], r.priorite).sort((a, b) => b.modifieLe.localeCompare(a.modifieLe));
  return (
    <>
      <h2 className="text-2xl font-bold">Dossiers terminés</h2>
      <p className="mb-4 mt-1 text-ink-muted">Ouvrez un dossier pour le rouvrir si besoin.</p>
      <div className="mb-4"><Filtres listes={data.listes} action="/espace-bureau/bureau/termines" valeurs={r} /></div>
      <ListeDossiers grouper={false} resume={resumeFiltres(r)} dossiers={dossiers} noms={noms} vide="Aucun dossier terminé pour le moment." />
    </>
  );
}
