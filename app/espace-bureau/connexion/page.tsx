import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/hub/LoginForm";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { currentHubUser } from "@/lib/hub/page-guards";

export const metadata: Metadata = { title: "Connexion · Espace des élus" };

export default async function ConnexionPage() {
  const user = await currentHubUser();
  if (user) redirect("/espace-bureau");
  return (
    <>
      <PageHero slim title="Espace des élus" description="Réservé aux élus du conseil municipal et à la secrétaire de mairie." />
      <PageShell className="pb-16 pt-2 sm:pb-20">
        <Card className="max-w-xl">
          <h2 className="font-display text-2xl font-bold text-moss-dark">Connexion</h2>
          <p className="mt-1 text-ink-muted">Saisissez l’identifiant et le mot de passe qui vous ont été remis.</p>
          <LoginForm />
        </Card>
      </PageShell>
    </>
  );
}
