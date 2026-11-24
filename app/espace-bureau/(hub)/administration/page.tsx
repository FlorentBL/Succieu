import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { requireHubPageUser } from "@/lib/hub/page-guards";

export const metadata: Metadata = { title: "Administration" };

/** Emplacement de la gestion des comptes (bibliothèque : lib/hub/users.ts). Réservé aux administrateurs. */
export default async function AdministrationPage() {
  const user = await requireHubPageUser();
  if (user.role !== "admin") redirect("/espace-bureau");
  return (
    <>
      <PageHero slim title="Administration" description="Comptes et droits des membres du bureau." />
      <PageShell width="narrow" className="pb-16 pt-2 sm:pb-20">
        <Card>
          <p className="text-ink-muted">L’écran de gestion des comptes n’est pas encore disponible.</p>
        </Card>
      </PageShell>
    </>
  );
}
