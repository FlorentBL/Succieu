import Link from "next/link";
import { redirect } from "next/navigation";
import { DossierForm } from "@/components/suivi/DossierForm";
import { btnGhost } from "@/components/suivi/ui";
import { requireModulePage } from "@/lib/hub/page-guards";
import { lireNoms, readData } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

export default async function Modifier({ params }: { params: Promise<{ id: string }> }) {
  const { level } = await requireModulePage("espace-bureau");
  const { id } = await params;
  if (level !== "write") redirect(`/espace-bureau/bureau/dossier/${id}`);
  const [data, { noms, actifs }] = await Promise.all([readData(), lireNoms()]);
  const d = data.dossiers.find((x) => x.id === id);
  if (!d) {
    return (
      <>
        <h2 className="text-2xl font-bold">Dossier introuvable</h2>
        <Link href="/espace-bureau/bureau" className={`${btnGhost} mt-4`}>Retour aux dossiers</Link>
      </>
    );
  }
  // Un référent désormais désactivé reste proposé (et décochable) tant qu'il figure sur le dossier.
  const comptes = [...actifs, ...d.referents.filter((r) => !actifs.some((a) => a.id === r) && noms[r]).map((r) => ({ id: r, nom: `${noms[r]} (compte désactivé)` }))];
  return (
    <>
      <h2 className="mb-3 text-2xl font-bold">Modifier le dossier</h2>
      <DossierForm mode="modifier" comptes={comptes} listes={data.listes} dossier={d} />
    </>
  );
}
