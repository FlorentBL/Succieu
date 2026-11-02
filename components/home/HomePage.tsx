import Image from "next/image";
import Link from "next/link";
import { HillArc } from "@/components/ui/HillArc";
import { HoursTable } from "@/components/ui/HoursTable";
import { PageShell } from "@/components/ui/PageShell";
import { IconArrowRight, IconMail, IconPhone, IconPin } from "@/components/icons/UiIcons";
import { NewsCarousel } from "@/components/home/NewsCarousel";
import { PanneauPocketEmbed } from "@/components/home/PanneauPocketEmbed";
import { QuickLinks } from "@/components/home/QuickLinks";
import { homeSpotlightItems } from "@/lib/homeSpotlight";
import { siteConfig } from "@/lib/site";

export const heroImageSrc = "/hero-village.jpg";

const intro =
  "Commune nature du Nord-Isère, porte des Terres Froides : la mairie, vos démarches et la vie du village.";

/** Ouverture : aplat vert à gauche (nom + carrousel d’actualités), photo du village à droite. */
function Hero() {
  return (
    <section aria-labelledby="accueil-titre" className="relative bg-moss-dark">
      <div className="grid lg:min-h-[560px] lg:grid-cols-[1fr_1.15fr]">
        <div className="relative order-2 overflow-hidden px-4 pb-24 pt-10 sm:px-8 lg:order-1 lg:pb-32 lg:pl-[max(2rem,calc((100vw-72rem)/2+2rem))] lg:pr-12 lg:pt-16">
          <span className="etourneau absolute -left-6 bottom-10 w-40 text-white/[0.07] lg:w-64" aria-hidden />
          <div className="relative max-w-xl">
            <h1
              id="accueil-titre"
              className="font-display flex items-center gap-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
            >
              <span className="etourneau w-8 text-colza sm:w-9" aria-hidden />
              Succieu
              <span className="sr-only"> — {intro}</span>
            </h1>
            <div className="mt-8 lg:mt-10">
              <NewsCarousel items={homeSpotlightItems} />
            </div>
          </div>
        </div>
        <div className="relative order-1 h-[280px] sm:h-[380px] lg:order-2 lg:h-auto">
          <Image
            src={heroImageSrc}
            alt="Vue aérienne du village de Succieu : l’église, la mairie et les toits de tuiles au milieu des prés et des bois"
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover object-[45%_55%]"
          />
        </div>
      </div>
      <HillArc variant="fill" className="absolute inset-x-0 bottom-0 h-12 text-surface sm:h-16 lg:h-24" />
    </section>
  );
}

const communeLinks = [
  {
    title: "Ma Mairie",
    href: "/ma-mairie",
    links: [
      { label: "Le conseil municipal", href: "/ma-mairie/conseil" },
      { label: "Le CCAS", href: "/ma-mairie/ccas" },
      { label: "Identité et histoire du village", href: "/ma-mairie/identite" },
    ],
  },
  {
    title: "Vivre à Succieu",
    href: "/vivre",
    links: [
      { label: "Le marché du samedi matin", href: "/vivre#marche" },
      { label: "Bruit et voisinage", href: "/vivre#bruit" },
      { label: "Bus et mobilité", href: "/vivre#mobilite" },
      { label: "Télé-alarme", href: "/vivre#telealarme" },
    ],
  },
  {
    title: "Urbanisme et démarches",
    href: "/demarches",
    links: [
      { label: "Urbanisme, PLU et permis", href: "/demarches/urbanisme" },
      { label: "Démarches administratives", href: "/demarches/administratif" },
      { label: "Déchèteries", href: "/vivre#decheteries" },
    ],
  },
];

export function HomePage() {
  return (
    <div>
      <Hero />

      <PageShell className="mt-4 sm:mt-6">
        <QuickLinks />
      </PageShell>

      <section aria-labelledby="accueil-commune" className="mt-16 sm:mt-20">
        <HillArc variant="fill" className="h-12 text-moss sm:h-16 lg:h-24" />
        <div className="relative overflow-hidden bg-moss text-white">
          <span className="etourneau pointer-events-none absolute -right-10 bottom-0 w-72 text-white/[0.08] lg:right-[6%] lg:w-96" aria-hidden />
          <PageShell className="relative pb-16 pt-4 sm:pb-20">
            <h2
              id="accueil-commune"
              className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
            >
              La commune en un coup d’œil
            </h2>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {communeLinks.map((group) => (
                <div key={group.href}>
                  <Link
                    href={group.href}
                    className="font-display inline-flex items-center gap-2 text-xl font-bold text-colza hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {group.title} <IconArrowRight className="h-5 w-5" />
                  </Link>
                  <ul className="mt-4 space-y-1 border-t border-white/20 pt-3">
                    {group.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="block rounded-lg py-1.5 text-[1.0625rem] text-white/90 underline decoration-white/25 underline-offset-4 transition hover:text-white hover:decoration-colza focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </PageShell>
        </div>
      </section>

      <section aria-labelledby="accueil-mairie" className="bg-surface pt-16 sm:pt-20">
        <PageShell>
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
            <div>
              <h2
                id="accueil-mairie"
                className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl"
              >
                Venir à la mairie
              </h2>
              <ul className="mt-6 space-y-4 text-[1.0625rem]">
                <li className="flex gap-3">
                  <IconPin className="mt-0.5 h-6 w-6 shrink-0 text-tuile" />
                  <span>
                    {siteConfig.streetAddress}, {siteConfig.postalCode} {siteConfig.city}
                  </span>
                </li>
                <li className="flex gap-3">
                  <IconPhone className="mt-0.5 h-6 w-6 shrink-0 text-tuile" />
                  <a href={siteConfig.phoneTel} className="font-semibold text-ink underline decoration-tuile/40 underline-offset-4 hover:decoration-tuile">
                    {siteConfig.phone}
                  </a>
                </li>
                <li className="flex gap-3">
                  <IconMail className="mt-0.5 h-6 w-6 shrink-0 text-tuile" />
                  <a href={`mailto:${siteConfig.emails.mairie}`} className="text-ink underline decoration-tuile/40 underline-offset-4 hover:decoration-tuile">
                    {siteConfig.emails.mairie}
                  </a>
                </li>
              </ul>
              <div className="mt-8 rounded-[1.5rem] bg-pre-pale p-5 sm:p-7">
                <h3 className="font-display text-xl font-bold text-moss-dark">Horaires d’accueil</h3>
                <HoursTable className="mt-4 max-w-md" />
              </div>
            </div>
            <PanneauPocketEmbed />
          </div>
        </PageShell>
      </section>
    </div>
  );
}
