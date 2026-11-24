export const PRIORITES = ["P1 Urgent", "P2 Important", "P3 À programmer"] as const;
export const AVANCEMENTS = ["À étudier", "À lancer", "En cours", "En attente", "À arbitrer", "Terminé", "Abandonné"] as const;
export const STATUTS = ["actif", "termine", "abandonne"] as const;

export type Statut = (typeof STATUTS)[number];

export type Nouvelle = {
  id: string;
  date: string; // ISO date-heure
  auteur: string; // nom affiché du compte du hub au moment de l'écriture (ou « Import suivi »)
  auteurId?: string; // id du compte du hub, si connu
  texte: string;
};

export type Dossier = {
  id: string;
  titre: string;
  commission: string;
  referents: string[]; // ids de comptes du hub
  priorite: string; // une valeur de PRIORITES ou ""
  avancement: string; // une valeur de AVANCEMENTS ou ""
  blocage: string;
  decisionAttendue: string;
  prochaineAction: string;
  echeance: string; // date ISO AAAA-MM-JJ si certaine, sinon libellé libre
  origine: string;
  aVoirEnBureau: boolean;
  statut: Statut;
  creeLe: string;
  modifieLe: string;
  revision: number;
  nouvelles: Nouvelle[];
  importKey?: string;
  /** Référents de l'ancienne appli (suivi.succieu.fr) sans compte rapproché lors de l'import : noms conservés pour mémoire. */
  anciensReferents?: string[];
};

export type Listes = {
  commissions: string[];
  decisionsAttendues: string[];
  blocages: string[];
};

/** Contenu de DATA_DIR/espace-bureau.json. Plus d'élus : les référents sont des comptes du hub. */
export type SuiviData = {
  version: 1;
  dossiers: Dossier[];
  listes: Listes;
};

export type DossierInput = Partial<
  Pick<
    Dossier,
    "titre" | "commission" | "referents" | "priorite" | "avancement" | "blocage" | "decisionAttendue" | "prochaineAction" | "echeance" | "origine" | "aVoirEnBureau" | "statut"
  >
>;

/** Acteur d'une écriture : compte connecté du hub (`identifier` sert au journal). */
export type Acteur = { id: string; nom: string; identifier: string };

/** Comptes connus du hub (id → nom affiché), pour valider et afficher les référents. */
export type Noms = Record<string, string>;
