import { normalizeStatus } from "@/lib/salle-des-fetes/logic";
import type { Reservation, ReservationLite, Status } from "@/lib/salle-des-fetes/types";

export type Item = Partial<Reservation> & ReservationLite;

const short = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const long = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const parseIso = (v: string) => {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const compactRange = (s: string, e: string) =>
  s === e ? short.format(parseIso(s)) : `${short.format(parseIso(s))} – ${short.format(parseIso(e))}`;
export const fullRange = (s: string, e: string) =>
  s === e ? long.format(parseIso(s)) : `Du ${long.format(parseIso(s))} au ${long.format(parseIso(e))}`;
export const longDate = (iso: string) => long.format(parseIso(iso));

export const STATUS_LABEL: Record<Status, string> = { demande: "Demande", option: "Option", confirmee: "Confirmée", annulee: "Annulée" };
export const statusLabel = (s: unknown) => STATUS_LABEL[(normalizeStatus(s) || "demande") as Status];

/** Pastille de statut : fond + liseré, jamais la couleur seule (le libellé reste écrit). */
export const STATUS_CLASS: Record<Status, string> = {
  demande: "border-colza bg-colza-pale",
  option: "border-ciel bg-ciel-pale",
  confirmee: "border-moss bg-pre-pale",
  annulee: "border-ink-subtle/50 bg-canvas text-ink-muted line-through decoration-1",
};
export const statusClass = (s: unknown) => STATUS_CLASS[(normalizeStatus(s) || "demande") as Status];

export const title = (i: Item) => i.purpose || i.name || "Réservation";
export const AUDIT_LABEL: Record<string, string> = {
  creation: "Réservation créée",
  modification: "Réservation modifiée",
  changement_statut: "Statut modifié",
  suppression: "Réservation annulée",
  restauration: "Réservation restaurée",
};
