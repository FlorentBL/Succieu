/**
 * Photos libres de la commune, avec leurs crédits (obligatoires pour CC BY-SA).
 * Source : Wikimedia Commons, catégorie « Succieu » (relevé du 02/11/2026).
 */
export type CommunePhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  /** Absent quand l’auteur est inconnu (document ancien). */
  author?: string;
  license: string;
  licenseUrl?: string;
  sourceUrl: string;
  /** Photo recadrée ou retouchée : mention exigée par la licence CC BY-SA. */
  modified?: boolean;
};

export const communePhotos = {
  eglise: {
    src: "/photos/commune/eglise-saint-pierre.webp",
    width: 1600,
    height: 1116,
    alt: "Façade de l’église Saint-Pierre-aux-Liens de Succieu, en pierre dorée, avec son clocher",
    caption: "L’église Saint-Pierre-aux-Liens",
    author: "Jean-Paul Corlin",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.fr",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%C3%89glise_de_Succieu_(2).jpg",
    modified: true,
  },
  cartePostale: {
    src: "/photos/commune/carte-postale-vue-generale.webp",
    width: 537,
    height: 344,
    alt: "Carte postale ancienne en noir et blanc : vue générale du village de Succieu et de son clocher",
    caption: "« Succieu (Isère) — Vue générale », carte postale du début du XXᵉ siècle",
    license: "Domaine public",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Succieu_vue_g%C3%A9n%C3%A9rale.jpg",
  },
} satisfies Record<string, CommunePhoto>;
