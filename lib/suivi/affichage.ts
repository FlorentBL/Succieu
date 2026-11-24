// Fonctions d'affichage pures (vocabulaire sans jargon, retard, dates lisibles). Testables sans Next.
import type { Dossier, Noms } from "./types";
import { ISO_DATE } from "./text";

export type NiveauPriorite = "urgent" | "important" | "programme" | "aucun";

export function niveauPriorite(p: string): NiveauPriorite {
  if (p.startsWith("P1")) return "urgent";
  if (p.startsWith("P2")) return "important";
  if (p.startsWith("P3")) return "programme";
  return "aucun";
}

/** « P1 Urgent » → « Urgent » : le code P1/P2/P3 n'est jamais montré. */
export function libellePriorite(p: string): string {
  return p.replace(/^P\d\s*/, "");
}

/** Date du jour AAAA-MM-JJ à Paris. */
export function aujourdhui(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(now);
}

export function enRetard(d: Pick<Dossier, "echeance" | "statut">, today = aujourdhui()): boolean {
  return d.statut === "actif" && ISO_DATE.test(d.echeance) && d.echeance < today;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** Date certaine → « 15 décembre 2026 » ; libellé (« Avril 2027 », « ASAP ») → tel quel. */
export function dateLongue(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3]) === 1 ? "1er" : Number(m[3])} ${MOIS[Number(m[2]) - 1]} ${m[1]}`;
}

export function dateHeure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const heure = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(d);
  return `${dateLongue(aujourdhui(d))} à ${heure}`;
}

/** Noms des référents (comptes du hub) ; un compte inconnu est omis. */
export function nomsReferents(d: Pick<Dossier, "referents">, noms: Noms): string {
  return d.referents.map((id) => noms[id] ?? "").filter(Boolean).join(", ");
}

/** Pour l'ordre du jour : urgents + marqués « à voir en bureau », marqués d'abord. */
export function ordreDuJour(dossiers: Dossier[]): Dossier[] {
  return dossiers
    .filter((d) => d.statut === "actif" && (d.aVoirEnBureau || niveauPriorite(d.priorite) === "urgent"))
    .sort((a, b) => Number(b.aVoirEnBureau) - Number(a.aVoirEnBureau) || (a.priorite || "Z").localeCompare(b.priorite || "Z") || a.titre.localeCompare(b.titre, "fr"));
}
