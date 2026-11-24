import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { HubAdminApp } from "@/components/hub-admin/HubAdminApp";

export default function HubAdminPage() {
  return (
    <>
      <PageHero slim title="Comptes du bureau" description="Créer les comptes, régler les droits par module, consulter le journal." />
      <PageShell className="py-4 sm:py-6">
        <HubAdminApp />
      </PageShell>
    </>
  );
}
