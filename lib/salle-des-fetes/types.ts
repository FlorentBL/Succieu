/** Types du module « Salle des fêtes » (sans dépendance serveur : importables côté client). */

export const STATUSES = ["demande", "option", "confirmee", "annulee"] as const;
export type Status = (typeof STATUSES)[number];
export const ROOMS = ["grande", "petite"] as const;
export type Room = (typeof ROOMS)[number];
export type YesNo = "oui" | "non";
export type KeyHandover = "veille" | "matin";

/** Statuts qui occupent la salle (une annulation la libère). */
export const BLOCKING_STATUSES: readonly Status[] = ["demande", "option", "confirmee"];

/** Réservation complète telle que stockée (droit d'écriture). */
export type Reservation = {
  id: string;
  status: Status;
  /** Anti-écrasement : incrémentée à chaque modification. */
  revision: number;
  name: string;
  address: string;
  postalCity: string;
  email: string;
  phone: string;
  purpose: string;
  startDate: string; // AAAA-MM-JJ
  endDate: string; // AAAA-MM-JJ, ≥ startDate
  roomTypes: Room[];
  keyHandover: KeyHandover;
  depositPaid: YesNo;
  balancePaid: YesNo;
  balanceAtKeys: YesNo;
  /** Visibilité dans le futur agenda public (par défaut false). */
  publicVisible: boolean;
  /** Titre public facultatif ; à défaut `purpose`. */
  publicTitle?: string;
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string;
  statusBeforeCancellation?: Status;
};

/** Vue en lecture seule : ni coordonnées personnelles ni paiements. */
export type ReservationLite = Pick<Reservation, "id" | "status" | "purpose" | "startDate" | "endDate" | "roomTypes">;

/** Réservation en conflit renvoyée avec un 409 (sans coordonnées ni paiements). */
export type ConflictItem = Pick<
  Reservation,
  "id" | "status" | "purpose" | "name" | "startDate" | "endDate" | "roomTypes"
> & { conflictingRooms: Room[] };

export type AuditEvent = {
  id: string;
  reservationId: string;
  action: "creation" | "modification" | "changement_statut" | "suppression" | "restauration" | "import";
  actor: string;
  at: string;
  before: Reservation | null;
  after: Reservation | null;
};

export type Dashboard = {
  generatedAt: string;
  counts: {
    upcoming: number;
    paymentsDue: number;
    keyHandovers: number;
    byStatus: Record<Status, number>;
  };
  upcoming: (Reservation | ReservationLite)[];
  paymentsDue: Reservation[];
  keyHandovers: ((Reservation | ReservationLite) & { keyHandoverDate: string })[];
};

/** Projection publique future (non exposée pour l'instant). */
export type PublicSlot = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  rooms: Room[];
};
