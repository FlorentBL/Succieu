import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { CouncilPhoto } from "@/components/council/CouncilPhoto";
import { IconArrowRight } from "@/components/icons/UiIcons";
import { PageShell } from "@/components/ui/PageShell";
import { councilMembers } from "@/lib/council";

const executive = councilMembers
  .filter((m) => m.category === "executif")
  .sort((a, b) => a.order - b.order);

export const metadata: Metadata = {
  title: "Ma Mairie",
  description:
    "Conseil municipal, CCAS, identité et histoire — Mairie de Succieu.",
};

export default function MaMairiePage() {
  return (
    <div>
      <PageHero
        title="Ma Mairie"
        description={<>Institution, élus et vie communale.</>}
      />
      <PageShell className="pb-8 pt-6 sm:pt-10">
        <section aria-labelledby="elus-titre">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="elus-titre" className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Vos élus
            </h2>
            <Link
              href="/ma-mairie/conseil"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-moss-dark underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Tout le conseil municipal <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {executive.map((m, i) => (
              <li key={m.line}>
                <Link
                  href="/ma-mairie/conseil"
                  className="group block focus-visible:rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus)]"
                >
                  <CouncilPhoto
                    photoFile={m.photoFile}
                    name={m.line}
                    priority={i < 2}
                    className={`rounded-[1.25rem] ${i === 0 ? "ring-4 ring-colza ring-offset-2 ring-offset-surface" : ""}`}
                  />
                  <span className="mt-3 block font-display text-lg font-bold leading-tight text-ink">
                    {m.firstName} {m.lastName}
                  </span>
                  <span className={`mt-0.5 block text-sm ${i === 0 ? "font-semibold text-tuile" : "text-ink-muted"}`}>
                    {m.role}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <ul className="mt-16 grid gap-4 sm:grid-cols-2">
          {[
            {
              href: "/ma-mairie/ccas",
              title: "Le CCAS",
              text: "Centre communal d’action sociale : aides, repas des aînés, colis de Noël et contacts.",
              tone: "bg-tuile text-white",
            },
            {
              href: "/ma-mairie/identite",
              title: "Identité et histoire",
              text: "Le blason, l’étourneau du logo, l’église et l’origine du nom de Succieu.",
              tone: "bg-ciel text-white",
            },
          ].map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`group flex h-full flex-col rounded-[1.5rem] p-7 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgba(20,33,26,0.45)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] sm:p-8 ${t.tone}`}
              >
                <span className="font-display flex items-center justify-between gap-3 text-2xl font-bold">
                  {t.title}
                  <IconArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="mt-3 text-base leading-relaxed opacity-95">{t.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </PageShell>
    </div>
  );
}
