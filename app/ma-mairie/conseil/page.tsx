import type { Metadata } from "next";
import { CouncilMemberCard } from "@/components/council/CouncilMemberCard";
import {
  councilExecutive,
  councilOthers,
} from "@/lib/council";

export const metadata: Metadata = {
  title: "Conseil municipal",
  description:
    "Maire, adjoints et conseillers municipaux de Succieu — composition issue de la feuille de proclamation.",
};

export default function ConseilPage() {
  return (
    <div className="relative">
      <div className="border-b border-border-subtle bg-gradient-to-b from-surface via-canvas/40 to-canvas">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-brass">
            Institution
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Conseil municipal
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Équipe municipale en fonction — portraits et fonctions. Les images
            correspondent aux fichiers déposés dans le dossier des photos de la
            commune (noms alignés sur les fichiers réels).
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <section aria-labelledby="titre-executif" className="scroll-mt-28">
          <div className="flex flex-col gap-2 border-b border-border-subtle pb-6">
            <h2
              id="titre-executif"
              className="font-display text-2xl font-semibold text-ink sm:text-3xl"
            >
              Exécutif municipal
            </h2>
            <p className="max-w-2xl text-ink-muted">
              Maire et adjoints — élection du maire et des adjoints (ordre de
              proclamation).
            </p>
          </div>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {councilExecutive.map((m, i) => (
              <li key={m.photoFile}>
                <CouncilMemberCard member={m} priority={i < 3} />
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="titre-conseillers"
          className="mt-20 scroll-mt-28 border-t border-border-subtle pt-16"
        >
          <div className="flex flex-col gap-2 pb-6">
            <h2
              id="titre-conseillers"
              className="font-display text-2xl font-semibold text-ink sm:text-3xl"
            >
              Conseillers municipaux
            </h2>
            <p className="max-w-2xl text-ink-muted">
              Membres du conseil municipal (ordre de la liste officielle).
            </p>
          </div>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {councilOthers.map((m) => (
              <li key={m.photoFile}>
                <CouncilMemberCard member={m} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
