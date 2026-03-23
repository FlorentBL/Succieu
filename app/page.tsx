import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Accueil",
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

export default function HomePage() {
  return (
    <div>
      <div className="relative overflow-hidden border-b border-border-subtle bg-surface">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(143,126,95,0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(74,107,92,0.08), transparent 50%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-brass">
            Bienvenue
          </p>
          <h1 className="font-display mt-4 max-w-3xl text-[2.35rem] font-semibold leading-[1.12] tracking-tight text-ink sm:text-5xl sm:leading-[1.08]">
            {siteConfig.name}
          </h1>
          <p className="mt-2 font-display text-xl font-normal italic text-ink-subtle sm:text-2xl">
            {siteConfig.tagline}
          </p>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Au cœur du Nord-Isère, une commune rurale entre paysages vallonnés et
            vie de village. Services de la mairie, démarches et vie locale.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-ink px-7 py-3 text-sm font-semibold tracking-wide text-surface shadow-sm transition hover:bg-moss-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Contact
            </Link>
            <Link
              href="/demarches"
              className="inline-flex items-center justify-center rounded-full border border-border-subtle bg-surface px-7 py-3 text-sm font-semibold tracking-wide text-ink shadow-sm transition hover:border-brass/40 hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Mes démarches
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="sr-only">Accès rapide</h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <Card className="h-full p-0">
              <Link
                href="/ma-mairie"
                className="block p-6 focus-visible:rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-brass">
                  Institution
                </span>
                <span className="mt-2 block font-display text-xl font-semibold text-ink">
                  Ma Mairie
                </span>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  Conseil municipal, CCAS, identité et histoire du village.
                </p>
              </Link>
            </Card>
          </li>
          <li>
            <Card className="h-full p-0">
              <Link
                href="/vivre"
                className="block p-6 focus-visible:rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-brass">
                  Quotidien
                </span>
                <span className="mt-2 block font-display text-xl font-semibold text-ink">
                  Vivre à Succieu
                </span>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  Marché, déchets, mobilité et services du quotidien.
                </p>
              </Link>
            </Card>
          </li>
          <li>
            <Card className="h-full p-0 sm:col-span-2 lg:col-span-1">
              <Link
                href="/demarches/urbanisme"
                className="block p-6 focus-visible:rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-brass">
                  Territoire
                </span>
                <span className="mt-2 block font-display text-xl font-semibold text-ink">
                  Urbanisme
                </span>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  PLU, CAPI, démarches et contacts du service.
                </p>
              </Link>
            </Card>
          </li>
        </ul>
      </div>
    </div>
  );
}
