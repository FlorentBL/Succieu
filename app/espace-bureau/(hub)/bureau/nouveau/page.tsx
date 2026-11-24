import { redirect } from "next/navigation";
import { DossierForm } from "@/components/suivi/DossierForm";
import { requireModulePage } from "@/lib/hub/page-guards";
import { lireNoms, readData } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

export default async function Nouveau() {
  const { user, level } = await requireModulePage("espace-bureau");
  if (level !== "write") redirect("/espace-bureau/bureau");
  const [data, { actifs }] = await Promise.all([readData(), lireNoms()]);
  return (
    <>
      <h2 className="mb-3 text-2xl font-bold">Nouveau dossier</h2>
      <DossierForm mode="creer" comptes={actifs} listes={data.listes} referentParDefaut={user.id} />
    </>
  );
}
