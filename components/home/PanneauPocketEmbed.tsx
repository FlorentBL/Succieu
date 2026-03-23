import { siteConfig } from "@/lib/site";

/**
 * Bloc iframe PanneauPocket (sans wrapper de section) pour placement en grille.
 * Le widget officiel est étroit (type « téléphone ») : on le centre dans l’encart.
 */
export function PanneauPocketEmbed() {
  const embedUrl = siteConfig.urls.panneauPocketEmbed;

  return (
    <div className="min-w-0">
      <h2
        id="accueil-panneaupocket"
        className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
      >
        Actualités & alertes
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        Fil d’informations géré avec{" "}
        <a
          href="https://www.panneaupocket.com/"
          className="font-medium text-sage-dark underline underline-offset-2"
          rel="noopener noreferrer"
        >
          PanneauPocket
        </a>.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border-subtle bg-canvas/40 shadow-[0_12px_40px_-20px_rgba(26,22,20,0.2)]">
        <div className="flex w-full justify-center px-2 py-4 sm:px-4 sm:py-5">
          <iframe
            title="PanneauPocket — informations municipales de Succieu"
            src={embedUrl}
            className="block h-[26rem] w-[min(100%,20rem)] shrink-0 border-0 sm:h-[28rem] lg:h-[32rem]"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}
