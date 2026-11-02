import type { ReactNode } from "react";
import { CreditedPhoto } from "@/components/ui/CreditedPhoto";
import { HillArc } from "@/components/ui/HillArc";
import type { CommunePhoto } from "@/lib/communePhotos";
import { PageShell } from "@/components/ui/PageShell";

type Props = {
  /** Conservé pour compatibilité ; n’est plus affiché. */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Contenu sous le texte (CTA, etc.) */
  children?: ReactNode;
  className?: string;
  /** Moins de marge verticale + intro un peu plus large (pages denses type annuaire). */
  compact?: boolean;
  /** Photo de la commune affichée à côté du titre (avec son crédit). */
  photo?: CommunePhoto;
};

/**
 * Bandeau d’intro de page : aplat vert prairie, étourneau en filigrane,
 * bas découpé par l’arc de colline du logo.
 */
export function PageHero({
  title,
  description,
  children,
  className = "",
  compact = false,
  photo,
}: Props) {
  const shellPad = compact ? "pt-10 pb-8 sm:pt-12" : "pt-12 pb-10 sm:pt-16 lg:pt-20";
  const descMax = compact ? "max-w-3xl" : "max-w-2xl";
  const descText = compact ? "text-base leading-relaxed" : "text-lg leading-[1.7]";

  return (
    <div className={`relative overflow-hidden bg-pre-pale ${className}`}>
      {photo ? null : (
        <span
          className="etourneau pointer-events-none absolute -right-6 top-6 hidden w-44 text-moss/10 md:block lg:right-[8%] lg:w-56"
          aria-hidden
        />
      )}
      <PageShell className={`relative ${shellPad}`}>
        <div className={photo ? "grid items-center gap-8 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-12" : ""}>
          <div>
            <h1 className="font-display max-w-3xl text-4xl font-bold tracking-tight text-moss-dark sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
              {title}
            </h1>
            {description ? (
              <div className={`mt-5 ${descMax} ${descText} text-ink-muted`}>
                {description}
              </div>
            ) : null}
            {children ? <div className="mt-8">{children}</div> : null}
          </div>
          {photo ? (
            <CreditedPhoto
              photo={photo}
              priority
              sizes="(min-width: 1024px) 26rem, 100vw"
              rounded="rounded-[1.5rem] shadow-[0_18px_40px_-24px_rgba(20,33,26,0.55)]"
            />
          ) : null}
        </div>
      </PageShell>
      <HillArc variant="fill" className="h-8 text-surface sm:h-12 lg:h-16" />
    </div>
  );
}
