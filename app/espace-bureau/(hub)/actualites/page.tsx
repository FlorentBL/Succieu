import { ActusApp } from "@/components/bureau/ActusApp";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { requireModulePage } from "@/lib/hub/page-guards";

export default async function ActualitesPage() {
  const { user, level } = await requireModulePage("actus-agenda");
  return (
    <>
      <PageHero
        slim
        title="Actualités & agenda"
        description="Proposez une actualité ou un événement pour l’agenda : votre saisie est relue puis validée avant d’apparaître sur le site."
      />
      <PageShell width="narrow" className="pb-16 pt-2 sm:pb-20">
        <ActusApp canWrite={level === "write"} isAdmin={user.role === "admin"} />
      </PageShell>
    </>
  );
}
