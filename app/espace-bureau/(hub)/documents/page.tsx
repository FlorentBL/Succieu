import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { driveUrl } from "@/lib/hub/drive";
import { requireModulePage } from "@/lib/hub/page-guards";

export const metadata: Metadata = { title: "Documents" };
export const dynamic = "force-dynamic";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";

export default async function DocumentsPage() {
  await requireModulePage("documents");
  const url = driveUrl();
  return (
    <>
      <PageHero slim title="Documents" description="Le drive de la commune, pour les documents partagés du bureau et du conseil." />
      <PageShell width="narrow" className="space-y-6 pb-16 pt-2 sm:pb-20">
        <Card>
          <h2 className="font-display text-xl font-bold text-moss-dark">Le drive</h2>
          <p className="mt-2 text-ink-muted">
            Les documents sont dans un drive à part, avec ses propres identifiants, attribués par Florent. Ils ne sont pas
            les mêmes que ceux de l’espace bureau : il faut se connecter une seconde fois sur le drive.
          </p>
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
          <h2 className="font-display text-xl font-bold text-moss-dark">Mot de passe du drive oublié ?</h2>
          <p className="mt-2 text-ink-muted">
            Contactez l’administrateur de l’espace bureau : il fera réinitialiser vos identifiants du drive.
          </p>
        </Card>
      </PageShell>
    </>
  );
}
