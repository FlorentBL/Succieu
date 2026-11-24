import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { SuiviNav, type Onglet } from "@/components/suivi/SuiviNav";
import { requireModulePage } from "@/lib/hub/page-guards";

const BASE = "/espace-bureau/bureau";

/** Coquille du module « Espace Bureau » : garde du module, bandeau, sous-navigation. */
export default async function SuiviLayout({ children }: { children: React.ReactNode }) {
  const { level } = await requireModulePage("espace-bureau");
  const onglets: Onglet[] = [
    { href: BASE, label: "Dossiers", aussi: [`${BASE}/tous`] },
    { href: `${BASE}/tableau`, label: "Tableau" },
    { href: `${BASE}/reunion`, label: "Réunion" },
    { href: `${BASE}/termines`, label: "Terminés" },
    ...(level === "write" ? [{ href: `${BASE}/nouveau`, label: "Nouveau dossier" }] : []),
  ];
  return (
    <>
      <div className="print:hidden">
        <PageHero slim title="Espace Bureau" description="Suivi des dossiers du bureau." />
      </div>
      <PageShell className="pb-16 pt-4 sm:pb-20">
        <SuiviNav onglets={onglets} exportHref="/api/espace-bureau/export" />
        <div className="mt-5">{children}</div>
      </PageShell>
    </>
  );
}
