import type { Metadata } from "next";
import { LogoutButton } from "@/components/hub/LogoutButton";
import { PasswordForm } from "@/components/hub/PasswordForm";
import { TextSizeControl } from "@/components/hub/TextSize";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { requireHubPageUser } from "@/lib/hub/page-guards";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireHubPageUser();
  return (
    <>
      <PageHero slim title="Mon compte" description={`${user.displayName} · identifiant « ${user.identifier} »`} />
      <PageShell width="narrow" className="space-y-6 pb-16 pt-2 sm:pb-20">
        <Card>
          <h2 className="font-display text-xl font-bold text-moss-dark">Changer mon mot de passe</h2>
          <PasswordForm />
        </Card>
        <Card>
          <h2 className="font-display text-xl font-bold text-moss-dark">Taille du texte</h2>
          <p className="mt-1 text-ink-muted">Le réglage est mémorisé sur cet appareil.</p>
          <TextSizeControl className="mt-4" />
        </Card>
        <Card>
          <h2 className="font-display text-xl font-bold text-moss-dark">Session</h2>
          <p className="mt-1 text-ink-muted">Sur un appareil partagé, déconnectez-vous en partant.</p>
          <LogoutButton className="mt-4" />
        </Card>
      </PageShell>
    </>
  );
}
