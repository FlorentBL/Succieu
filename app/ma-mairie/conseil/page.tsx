import type { Metadata } from "next";
import { CouncilMemberCard } from "@/components/council/CouncilMemberCard";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import {
  councilExecutive,
  councilOthers,
} from "@/lib/council";

export const metadata: Metadata = {
  title: "Conseil municipal",
  description:
    "Présentation du maire, des adjoints et des conseillers municipaux de Succieu — équipe municipale en fonction.",
};

export default function ConseilPage() {
  return (
    <div className="relative">
      <PageHero
        compact
        eyebrow="Institution"
        title="Conseil municipal"
        description={
          <>
            La commune est administrée par un conseil municipal composé d’un maire,
            d’adjoints et de conseillers élus. Cette page présente les membres de
            l’équipe en fonction, leurs portraits et leurs attributions.
          </>
        }
      />

      <PageShell className="pb-16 pt-10 sm:pb-20 sm:pt-12 lg:pb-24 lg:pt-14">
        <section aria-labelledby="titre-executif" className="scroll-mt-28">
          <div className="flex flex-col gap-2 border-b border-border-subtle pb-6 sm:gap-3 sm:pb-7">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-brass">
              Exécutif
            </p>
            <h2
              id="titre-executif"
              className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
            >
              Exécutif municipal
            </h2>
            <p className="max-w-3xl text-base leading-relaxed text-ink-muted">
              Le maire et les adjoints constituent l’exécutif municipal. Ils sont
              élus par le conseil municipal après les élections, selon l’ordre de
              proclamation officiel.
            </p>
          </div>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:mt-10 lg:grid-cols-3 lg:gap-10">
            {councilExecutive.map((m, i) => (
              <li key={m.photoFile}>
                <CouncilMemberCard member={m} priority={i < 3} />
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="titre-conseillers"
          className="mt-16 scroll-mt-28 border-t border-border-subtle pt-12 sm:mt-20 sm:pt-16"
        >
          <div className="flex flex-col gap-2 pb-6 sm:gap-3 sm:pb-7">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-brass">
              Conseil
            </p>
            <h2
              id="titre-conseillers"
              className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
            >
              Conseillers municipaux
            </h2>
            <p className="max-w-3xl text-base leading-relaxed text-ink-muted">
              Les conseillers municipaux siègent au conseil et participent aux
              décisions qui concernent la vie locale. Ils sont présentés ci-dessous
              selon l’ordre figurant sur la liste officielle.
            </p>
          </div>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-10">
            {councilOthers.map((m) => (
              <li key={m.photoFile}>
                <CouncilMemberCard member={m} />
              </li>
            ))}
          </ul>
        </section>
      </PageShell>
    </div>
  );
}
