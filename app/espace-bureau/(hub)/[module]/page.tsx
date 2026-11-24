import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { HUB_MODULES } from "@/lib/hub/modules";
import { requireModulePage } from "@/lib/hub/page-guards";

/**
 * Emplacement provisoire des modules sans page propre : une page dédiée
 * `app/espace-bureau/(hub)/<chemin>/page.tsx` (ou hors groupe pour l'existant) prend le pas dessus.
 */
export default async function ModulePlaceholder({ params }: { params: Promise<{ module: string }> }) {
  const { module: slug } = await params;
  const mod = HUB_MODULES.find((m) => m.path === `/espace-bureau/${slug}`);
  if (!mod) notFound();
  await requireModulePage(mod.id);
  return (
    <>
      <PageHero slim title={mod.label} description={mod.description} />
      <PageShell width="narrow" className="pb-16 pt-2 sm:pb-20">
        <Card>
          <p className="text-ink-muted">Ce module n’est pas encore ouvert. Il arrivera prochainement dans l’espace bureau.</p>
        </Card>
      </PageShell>
    </>
  );
}
