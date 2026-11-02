import { siteConfig } from "@/lib/site";

type Props = {
  /** Liste détaillée ou version compacte pour le pied de page */
  variant?: "default" | "footer";
  className?: string;
};

export function MairieOpeningHours({ variant = "default", className = "" }: Props) {
  const rows = siteConfig.mairieOpeningHours;

  if (variant === "footer") {
    return (
      <div className={className}>
        <p className="text-sm font-semibold text-white">Horaires d’accueil</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm leading-snug text-white/75">
          {rows.map((row) => (
            <div key={row.day} className="contents">
              <dt className="text-white/90">{row.day}</dt>
              <dd>{row.hours}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <dl
      className={`grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm ${className}`.trim()}
    >
      {rows.map((row) => (
        <div key={row.day} className="contents">
          <dt className="font-medium text-ink">{row.day}</dt>
          <dd className="text-ink-muted">{row.hours}</dd>
        </div>
      ))}
    </dl>
  );
}
