import type { ReactNode } from "react";
import { PageShell } from "@/components/ui/PageShell";

type Props = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  /** Contenu sous le texte (CTA, etc.) */
  children?: ReactNode;
  className?: string;
  /** Moins de marge verticale + intro un peu plus large (pages denses type annuaire). */
  compact?: boolean;
};

/**
 * Bandeau d’intro de page : rythme vertical, filet décoratif, titre unique visuel fort.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
  className = "",
  compact = false,
}: Props) {
  const shellPad = compact
    ? "py-10 sm:py-12 lg:py-14"
    : "py-16 sm:py-20 lg:py-24";
  const titleGap = compact ? "mt-5" : "mt-6";
  const descGap = compact ? "mt-4" : "mt-6";
  const descMax = compact ? "max-w-3xl" : "max-w-2xl";
  const descText = compact ? "text-base leading-relaxed" : "text-lg leading-[1.75]";
  const childGap = compact ? "mt-6" : "mt-10";

  return (
    <div
      className={`border-b border-border-subtle bg-gradient-to-b from-surface via-surface to-canvas/50 ${className}`}
    >
      <PageShell className={shellPad}>
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-brass">
          {eyebrow}
        </p>
        <div
          className="mt-4 h-px w-12 bg-brass/50"
          aria-hidden
        />
        <h1 className={`font-display ${titleGap} max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]`}>
          {title}
        </h1>
        {description ? (
          <div className={`${descGap} ${descMax} ${descText} text-ink-muted`}>
            {description}
          </div>
        ) : null}
        {children ? <div className={childGap}>{children}</div> : null}
      </PageShell>
    </div>
  );
}
