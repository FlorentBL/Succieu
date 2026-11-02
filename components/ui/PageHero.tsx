import Image from "next/image";
import type { ReactNode } from "react";
import { HillArc } from "@/components/ui/HillArc";
import { PageShell } from "@/components/ui/PageShell";
import { PhotoCredit } from "@/components/ui/PhotoCredit";
import type { CommunePhoto } from "@/lib/communePhotos";

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
  /** Photo de la commune : occupe la moitié droite du bandeau, jusqu’au bord de l’écran. */
  photo?: CommunePhoto;
};

/**
 * Bandeau d’intro de page : aplat vert prairie, bas découpé par l’arc de colline du logo.
 * Sans photo : étourneau en filigrane. Avec photo : la photo prend la moitié droite.
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

  const text = (
    <>
      <h1 className="font-display max-w-3xl text-4xl font-bold tracking-tight text-moss-dark sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
        {title}
      </h1>
      {description ? (
        <div className={`mt-5 ${descMax} ${descText} text-ink-muted`}>{description}</div>
      ) : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </>
  );

  if (photo) {
    return (
      <div className={`relative overflow-hidden bg-pre-pale ${className}`}>
        <div className="relative h-56 sm:h-72 lg:absolute lg:inset-y-0 lg:left-1/2 lg:right-0 lg:h-auto">
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-[50%_72%]"
          />
          <p className="absolute bottom-3 right-3 max-w-[90%] rounded-full bg-ink/55 px-3 py-1 text-[0.72rem] leading-snug text-white/90 lg:bottom-16">
            <PhotoCredit photo={photo} />
          </p>
        </div>
        <PageShell className="relative">
          <div className="py-10 sm:py-12 lg:flex lg:min-h-[22rem] lg:w-1/2 lg:items-center lg:py-16 lg:pr-12">
            <div>{text}</div>
          </div>
        </PageShell>
        <HillArc variant="fill" className="relative h-8 text-surface sm:h-12 lg:h-16" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-pre-pale ${className}`}>
      <span
        className="etourneau pointer-events-none absolute -right-6 top-6 hidden w-44 text-moss/10 md:block lg:right-[8%] lg:w-56"
        aria-hidden
      />
      <PageShell className={`relative ${shellPad}`}>{text}</PageShell>
      <HillArc variant="fill" className="h-8 text-surface sm:h-12 lg:h-16" />
    </div>
  );
}
