import { BureauApp } from "@/components/bureau/BureauApp";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";

export default function EspaceBureauPage() {
  return (
    <>
      <PageHero
        compact
        title="Espace bureau"
        description="Proposez une actualité ou un événement pour l’agenda : votre saisie est relue puis validée avant d’apparaître sur le site."
      />
      <PageShell width="narrow" className="pb-16 pt-2 sm:pb-20">
        <BureauApp />
      </PageShell>
    </>
  );
}
