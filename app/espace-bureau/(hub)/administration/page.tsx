import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HubAdminApp } from "@/components/hub-admin/HubAdminApp";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { requireHubPageUser } from "@/lib/hub/page-guards";

export const metadata: Metadata = { title: "Administration" };

/** Console des comptes du bureau, dans la coquille. Réservée aux administrateurs (un membre retourne à l'accueil). */
export default async function AdministrationPage() {
  const user = await requireHubPageUser();
  if (user.role !== "admin") redirect("/espace-bureau");
  return (
    <>
      <PageHero slim title="Administration" description="Créer les comptes, régler les droits par module, consulter le journal." />
      <PageShell className="space-y-6 pb-16 pt-2 sm:pb-20">
        <HubAdminApp selfId={user.id} />
      </PageShell>
    </>
  );
}
