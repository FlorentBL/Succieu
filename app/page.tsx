import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  IconMairie,
  IconTerritoire,
  IconVillage,
} from "@/components/icons/HomeCardIcons";
import { PanneauPocketEmbed } from "@/components/home/PanneauPocketEmbed";
import { PageShell } from "@/components/ui/PageShell";
import { homeSpotlightItems } from "@/lib/homeSpotlight";
import { siteConfig } from "@/lib/site";

/** Fichier dans `public/` — vue aérienne du village (fond hero + partage social) */
const heroImageSrc = "/hero-village.jpg";

export const metadata: Metadata = {
  /** Titre d’onglet court (sans répéter « — Succieu » du template du layout) */
  title: { absolute: siteConfig.shortName },
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: heroImageSrc,
        alt: "Vue aérienne du village de Succieu",
      },
    ],
  },
};

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block transition-transform duration-300 group-hover:translate-x-0.5 ${className}`}
      aria-hidden
    >
      →
    </span>
  );
}

export default function HomePage() {
  return (
    <div>
      {/* Hero : image pleine largeur + voile sombre + texte clair */}
      <section
        className="relative min-h-[min(85vh,640px)] overflow-hidden border-b border-white/10"
        aria-labelledby="accueil-titre-principal"
      >
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImageSrc}
            alt=""
            fill
            className="object-cover object-center"
            sizes="100vw"
            priority
          />
        </div>
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-b from-black/55 via-black/45 to-black/50"
          aria-hidden
        />
        <PageShell className="relative z-10 flex min-h-[min(85vh,640px)] flex-col justify-center py-20 sm:py-24 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-amber-100/90">
              Bienvenue
            </p>
            <div className="mt-4 h-px w-14 bg-white/45" aria-hidden />
            <h1
              id="accueil-titre-principal"
              className="font-display mt-8 text-[2.45rem] font-semibold leading-[1.1] tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-[3.25rem]"
            >
              {siteConfig.name}
            </h1>
            <p className="mt-4 font-display text-xl font-normal italic leading-snug text-white/90 sm:text-2xl">
              {siteConfig.tagline}
            </p>
            <p className="mt-8 text-lg leading-[1.75] text-white/85">
              Au cœur du Nord-Isère, une commune rurale entre paysages vallonnés
              <br />
              et vie de village. Services de la mairie, démarches et vie locale.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold tracking-wide text-ink shadow-md transition hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Contact
              </Link>
              <Link
                href="/demarches"
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-full border border-white/55 bg-white/10 px-8 py-3 text-sm font-semibold tracking-wide text-white backdrop-blur-sm transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Mes démarches
              </Link>
            </div>
          </div>
        </PageShell>
      </section>

      <section
        aria-labelledby={
          homeSpotlightItems.length > 0
            ? "accueil-actualite accueil-panneaupocket"
            : "accueil-panneaupocket"
        }
        className="border-t border-border-subtle bg-surface"
      >
        <PageShell className="py-12 sm:py-14 lg:py-16">
          <div
            className={
              homeSpotlightItems.length > 0
                ? "grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-10 xl:gap-12"
                : "mx-auto max-w-3xl"
            }
          >
            {homeSpotlightItems.length > 0 ? (
              <div className="min-w-0">
                <h2
                  id="accueil-actualite"
                  className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
                >
                  À la une
                </h2>
                <p className="mt-2 text-sm text-ink-muted">
                  L’info du moment sur la vie de la commune.
                </p>
                <ul className="mt-6 space-y-6">
                  {homeSpotlightItems.map((item) => (
                    <li key={item.id}>
                      <Card className="border border-border-subtle p-6 sm:p-8">
                        {item.meta ? (
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-brass">
                            {item.meta}
                          </p>
                        ) : null}
                        <h3 className="font-display mt-2 text-xl font-semibold text-moss-dark sm:text-2xl">
                          {item.title}
                        </h3>
                        <p className="mt-3 text-base leading-relaxed text-ink-muted">
                          {item.body}
                        </p>
                        <Link
                          href={item.href}
                          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sage-dark underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                        >
                          {item.cta} <ArrowIcon />
                        </Link>
                      </Card>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div
              className={
                homeSpotlightItems.length > 0
                  ? "min-w-0 lg:pt-0"
                  : ""
              }
            >
              <PanneauPocketEmbed />
            </div>
          </div>
        </PageShell>
      </section>

      <section
        aria-labelledby="accueil-explorer"
        className="border-t border-border-subtle bg-canvas/70"
      >
        <PageShell className="py-20 sm:py-24 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-brass">
              Navigation
            </p>
            <h2
              id="accueil-explorer"
              className="font-display mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
            >
              Explorer le site
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted">
              Accès directs vers les informations les plus consultées.
            </p>
          </div>

          <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-10">
            <li>
              <Card className="h-full p-0">
                <Link
                  href="/ma-mairie"
                  className="group flex min-h-[11rem] flex-col p-8 focus-visible:rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-canvas text-sage-dark ring-1 ring-border-subtle">
                    <IconMairie className="h-6 w-6" />
                  </span>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-brass">
                    Institution
                  </span>
                  <span className="mt-2 block font-display text-xl font-semibold text-ink sm:text-2xl">
                    Ma Mairie
                  </span>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-muted">
                    Conseil municipal, CCAS, identité et histoire du village.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-sage-dark">
                    En savoir plus <ArrowIcon />
                  </span>
                </Link>
              </Card>
            </li>
            <li>
              <Card className="h-full p-0">
                <Link
                  href="/vivre"
                  className="group flex min-h-[11rem] flex-col p-8 focus-visible:rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-canvas text-sage-dark ring-1 ring-border-subtle">
                    <IconVillage className="h-6 w-6" />
                  </span>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-brass">
                    Quotidien
                  </span>
                  <span className="mt-2 block font-display text-xl font-semibold text-ink sm:text-2xl">
                    Vivre à Succieu
                  </span>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-muted">
                    Marché, déchets, mobilité et services du quotidien.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-sage-dark">
                    En savoir plus <ArrowIcon />
                  </span>
                </Link>
              </Card>
            </li>
            <li className="sm:col-span-2 lg:col-span-1">
              <Card className="h-full p-0">
                <Link
                  href="/demarches/urbanisme"
                  className="group flex min-h-[11rem] flex-col p-8 focus-visible:rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-canvas text-sage-dark ring-1 ring-border-subtle">
                    <IconTerritoire className="h-6 w-6" />
                  </span>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-brass">
                    Territoire
                  </span>
                  <span className="mt-2 block font-display text-xl font-semibold text-ink sm:text-2xl">
                    Urbanisme
                  </span>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-muted">
                    PLU, CAPI, démarches et contacts du service.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-sage-dark">
                    En savoir plus <ArrowIcon />
                  </span>
                </Link>
              </Card>
            </li>
          </ul>
        </PageShell>
      </section>
    </div>
  );
}
