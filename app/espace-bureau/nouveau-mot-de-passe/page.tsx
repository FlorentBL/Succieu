import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/hub/LogoutButton";
import { PasswordForm } from "@/components/hub/PasswordForm";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { HUB_LOGIN_PATH, currentHubUser } from "@/lib/hub/page-guards";

export const metadata: Metadata = { title: "Nouveau mot de passe · Espace bureau" };

/** Écran imposé tant que le mot de passe est provisoire. */
export default async function NewPasswordPage() {
  const user = await currentHubUser();
  if (!user) redirect(HUB_LOGIN_PATH);
  if (!user.mustChangePassword) redirect("/espace-bureau");
  return (
    <>
      <PageHero slim title="Choisissez votre mot de passe" description={`Bienvenue ${user.displayName}. Le mot de passe provisoire ne sert qu’une fois.`} />
      <PageShell width="narrow" className="pb-16 pt-2 sm:pb-20">
        <Card className="max-w-xl">
          <PasswordForm forced />
          <div className="mt-6 border-t border-border-subtle pt-4">
            <LogoutButton />
          </div>
        </Card>
      </PageShell>
    </>
  );
}
