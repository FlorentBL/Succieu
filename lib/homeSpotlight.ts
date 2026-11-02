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
  /** Alerte (frelon, sécurité…) : mise en avant en rouge tuile */
  alert?: boolean;
  /** Image facultative (chemin dans `public/`), pour le futur fil d’actualités */
  image?: string;
};

export const homeSpotlightItems: HomeSpotlightItem[] = [
  {
    id: "frelon-asiatique",
    meta: "Alerte · 8 juin 2026",
    alert: true,
    title: "Lutte contre le frelon asiatique",
    body:
      "Vous avez repéré un nid ou suspectez la présence de frelons asiatiques ? La déclaration se fait sur le site officiel. La mairie et Vincent Joannes peuvent aussi vous accompagner.",
    href: "/vivre#frelon-asiatique",
    cta: "Voir la démarche à suivre",
  },
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
