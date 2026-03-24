/**
 * Conseil municipal — proclamation (élection du maire et des adjoints).
 *
 * Photos : fichiers réels dans `public/photos/`. Le champ `photoFile` doit
 * correspondre **exactement** au nom sur le disque (casse, espaces, extension).
 * Nouveaux fichiers : les exporter légers ou lancer `npm run optimize:photos`.
 */

export type CouncilCategory = "executif" | "conseiller";

export type CouncilMember = {
  /** Nom du fichier dans `public/photos/` (ex. "Herve Casse.JPG") */
  photoFile: string;
  civility: "M." | "Mme";
  firstName: string;
  lastName: string;
  /** Nom affiché : « Prénom NOM » */
  line: string;
  role: string;
  category: CouncilCategory;
  order: number;
};

export const councilMembers: CouncilMember[] = [
  {
    order: 1,
    photoFile: "Herve Casse.JPG",
    civility: "M.",
    firstName: "Hervé",
    lastName: "CASSE",
    line: "Hervé CASSE",
    role: "Maire",
    category: "executif",
  },
  {
    order: 2,
    photoFile: "Alain Douillet.JPG",
    civility: "M.",
    firstName: "Alain",
    lastName: "DOUILLET",
    line: "Alain DOUILLET",
    role: "Premier adjoint",
    category: "executif",
  },
  {
    order: 3,
    photoFile: "Audrey Grange.JPG",
    civility: "Mme",
    firstName: "Audrey",
    lastName: "GRANGE",
    line: "Audrey GRANGE",
    role: "2e adjointe",
    category: "executif",
  },
  {
    order: 4,
    photoFile: "Richard Veyet.JPG",
    civility: "M.",
    firstName: "Richard",
    lastName: "VEYET",
    line: "Richard VEYET",
    role: "3e adjoint",
    category: "executif",
  },
  {
    order: 5,
    photoFile: "Aurore Chambert.JPG",
    civility: "Mme",
    firstName: "Aurore",
    lastName: "CHAMBERT",
    line: "Aurore CHAMBERT",
    role: "4e adjointe",
    category: "executif",
  },
  {
    order: 6,
    photoFile: "Rolland Delair.JPG",
    civility: "M.",
    firstName: "Rolland",
    lastName: "DELAIR",
    line: "Rolland DELAIR",
    role: "Conseiller municipal",
    category: "conseiller",
  },
  {
    order: 7,
    photoFile: "Corinne Paquier.JPG",
    civility: "Mme",
    firstName: "Corinne",
    lastName: "PAQUIER",
    line: "Corinne PAQUIER",
    role: "Conseillère municipale",
    category: "conseiller",
  },
  {
    order: 8,
    photoFile: "Sandra Garnier.JPG",
    civility: "Mme",
    firstName: "Sandra",
    lastName: "GARNIER",
    line: "Sandra GARNIER",
    role: "Conseillère municipale",
    category: "conseiller",
  },
  {
    order: 9,
    photoFile: "Brigitte Gallois.JPG",
    civility: "Mme",
    firstName: "Brigitte",
    lastName: "GALLOIS",
    line: "Brigitte GALLOIS",
    role: "Conseillère municipale",
    category: "conseiller",
  },
  {
    order: 10,
    // Fichier fourni : prénom « Florent » sur le fichier — photo utilisée pour Florence ESTELLES-MOUTOT
    photoFile: "Florent Estelles Moutot.JPG",
    civility: "Mme",
    firstName: "Florence",
    lastName: "ESTELLES-MOUTOT",
    line: "Florence ESTELLES-MOUTOT",
    role: "Conseillère municipale",
    category: "conseiller",
  },
  {
    order: 11,
    photoFile: "Julien Dufeu.JPG",
    civility: "M.",
    firstName: "Julien",
    lastName: "DUFEU",
    line: "Julien DUFEU",
    role: "Conseiller municipal",
    category: "conseiller",
  },
  {
    order: 12,
    photoFile: "Florent Bonnet Ligeon.JPG",
    civility: "M.",
    firstName: "Florent",
    lastName: "BONNET-LIGEON",
    line: "Florent BONNET-LIGEON",
    role: "Conseiller municipal",
    category: "conseiller",
  },
  {
    order: 13,
    photoFile: "Laurie Poensin Caillat.JPG",
    civility: "Mme",
    firstName: "Laurie",
    lastName: "POËNSIN-CAILLAT",
    line: "Laurie POËNSIN-CAILLAT",
    role: "Conseillère municipale",
    category: "conseiller",
  },
  {
    order: 14,
    photoFile: "Romain Rudler.JPG",
    civility: "M.",
    firstName: "Romain",
    lastName: "RUDLER",
    line: "Romain RUDLER",
    role: "Conseiller municipal",
    category: "conseiller",
  },
  {
    order: 15,
    photoFile: "Dylan Tabaret.jpg",
    civility: "M.",
    firstName: "Dylan",
    lastName: "TABARET",
    line: "Dylan TABARET",
    role: "Conseiller municipal",
    category: "conseiller",
  },
];

export const councilExecutive = councilMembers.filter(
  (m) => m.category === "executif",
);
export const councilOthers = councilMembers.filter(
  (m) => m.category === "conseiller",
);
