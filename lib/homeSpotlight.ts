/**
 * Actualité mise en avant sur la page d’accueil.
 * Éditer ce fichier pour remplacer ou compléter les encarts (volumes légers = liste courte).
 */
export type HomeSpotlightItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  /** Affiché en petit (ex. période ou type d’info) */
  meta?: string;
};

export const homeSpotlightItems: HomeSpotlightItem[] = [
  {
    id: "nouveau-conseil",
    meta: "Institution",
    title: "Un nouveau conseil municipal",
    body:
      "Suite aux dernières élections municipales, Succieu est dotée d’un nouveau conseil municipal. Retrouvez le maire, les adjoints et les conseillers, ainsi que leurs fonctions.",
    href: "/ma-mairie/conseil",
    cta: "Découvrir le conseil municipal",
  },
];
