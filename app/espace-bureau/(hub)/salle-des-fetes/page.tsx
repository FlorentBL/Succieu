import { SalleDesFetes } from "@/components/salle-des-fetes/SalleDesFetes";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { requireModulePage } from "@/lib/hub/page-guards";

export const dynamic = "force-dynamic";

/** Réservations de la salle des fêtes (ex sdf.succieu.fr). Lecture : sans coordonnées ni paiements. */
export default async function SalleDesFetesPage() {
  const { level } = await requireModulePage("salle-des-fetes");
  return (
    <>
      <PageHero slim title="Salle des fêtes" description="Planning et réservations de la salle des fêtes de Succieu." />
      <PageShell className="pb-16 pt-2 sm:pb-20">
        <SalleDesFetes canWrite={level === "write"} />
      </PageShell>
    </>
  );
}
