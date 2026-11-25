import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { driveUrl } from "@/lib/hub/drive";
import { driveSyncEnabled } from "@/lib/hub/drive-sync";
import { driveLoginOf } from "@/lib/hub/users";
import { requireModulePage } from "@/lib/hub/page-guards";

export const metadata: Metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";

export default async function DocumentsPage() {
  const { user } = await requireModulePage("documents");
  const sync = driveSyncEnabled();
  const sansDrive = driveLoginOf(user) === null;
  const url = driveUrl();
  return (
    <>
      <PageHero slim title="Documents" description="Le drive de la commune, pour les documents partagés du bureau et du conseil." />
      <PageShell width="narrow" className="space-y-6 pb-16 pt-2 sm:pb-20">
        <Card>
          <h2 className="font-display text-xl font-bold text-moss-dark">Le drive</h2>
          {sansDrive ? (
            <p className="mt-2 text-ink-muted">
              Votre accès au drive se fait avec le compte de la mairie, depuis le poste de la mairie.
            </p>
          ) : sync ? (
            <>
              <p className="mt-2 text-ink-muted">
                Les documents partagés sont sur le drive de la commune. Connectez-vous avec le même identifiant et le même
                mot de passe que sur cet espace.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-muted">
                <li>
                  <strong>Partage Bureau</strong> : les membres du bureau.
                </li>
                <li>
                  <strong>Partage CM</strong> : tout le conseil municipal.
                </li>
              </ul>
              <p className="mt-2 text-ink-muted">Ces deux partages se trouvent dans « Espaces » du drive.</p>
              <p className="mt-2 text-sm text-ink-muted">
                Astuce : laissez votre navigateur enregistrer le mot de passe, il le proposera sur les deux sites.
              </p>
            </>
          ) : (
            <p className="mt-2 text-ink-muted">
              Les documents partagés sont sur le drive de la commune. Ouvrez-le et connectez-vous avec vos identifiants.
            </p>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener"
            className={`mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-moss-dark px-6 text-base font-semibold text-white transition-colors hover:bg-moss ${focusRing}`}
          >
            Ouvrir le drive
            <span className="sr-only"> (s’ouvre dans un nouvel onglet)</span>
          </a>
        </Card>
        <Card>
          <h2 className="font-display text-xl font-bold text-moss-dark">Mot de passe oublié ?</h2>
          <p className="mt-2 text-ink-muted">
            {sync
              ? "Demandez à l’administrateur : il vous en attribue un nouveau, valable sur le site et sur le drive."
              : "Demandez à l’administrateur de l’espace bureau."}
          </p>
        </Card>
      </PageShell>
    </>
  );
}
