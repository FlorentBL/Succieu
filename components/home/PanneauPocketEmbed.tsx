import { siteConfig } from "@/lib/site";

/**
 * Widget officiel PanneauPocket (iframe étroite, format « téléphone »),
 * posé sur un aplat bleu ciel.
 */
export function PanneauPocketEmbed({ className = "" }: { className?: string }) {
  return (
    <div
      className={`min-w-0 rounded-[1.5rem] bg-ciel-pale p-5 sm:p-6 ${className}`}
    >
      <h2
        id="accueil-panneaupocket"
        className="font-display text-2xl font-bold tracking-tight text-ink"
      >
        Alertes de la mairie
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Publiées sur{" "}
        <a
          href={siteConfig.urls.panneauPocket}
          className="font-semibold text-ciel underline underline-offset-2"
          rel="noopener noreferrer"
        >
          PanneauPocket
        </a>
        , aussi consultables sur téléphone avec l’application.
      </p>
      <div className="mt-5 flex justify-center">
        <iframe
          title="PanneauPocket — informations municipales de Succieu"
          src={siteConfig.urls.panneauPocketEmbed}
          className="block h-[28rem] w-[min(100%,20rem)] shrink-0 rounded-2xl border-0 bg-white shadow-[0_12px_30px_-18px_rgba(20,33,26,0.4)] lg:h-[31rem]"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
