// Regroupement et tri des dossiers du tableau (vue Kanban par avancement). Pur : testable sans Next.
import { niveauPriorite } from "./affichage";
import { ISO_DATE } from "./text";

/** Colonnes du tableau, dans l'ordre. « À trier » = avancement vide. Terminé/Abandonné n'y figurent pas. */
export const COLONNES = ["À trier", "À étudier", "À lancer", "En cours", "En attente", "À arbitrer"] as const;
export type Colonne = (typeof COLONNES)[number];

type Triable = { avancement: string; priorite: string; echeance: string; titre: string; statut?: string };

const RANG: Record<string, number> = { urgent: 0, important: 1, programme: 2, aucun: 3 };

/** Priorité (urgent d'abord), puis échéance datée (la plus proche d'abord ; libellés et vides après), puis titre. */
export function comparerCartes(a: Triable, b: Triable): number {
  const ra = RANG[niveauPriorite(a.priorite)];
  const rb = RANG[niveauPriorite(b.priorite)];
  if (ra !== rb) return ra - rb;
  const da = ISO_DATE.test(a.echeance) ? a.echeance : "9999";
  const db = ISO_DATE.test(b.echeance) ? b.echeance : "9999";
  if (da !== db) return da < db ? -1 : 1;
  return a.titre.localeCompare(b.titre, "fr");
}

/** Colonne d'un dossier actif ; null s'il est terminé ou abandonné. */
export function colonneDe(d: Pick<Triable, "avancement" | "statut">): Colonne | null {
  if (d.statut && d.statut !== "actif") return null;
  if (d.avancement === "Terminé" || d.avancement === "Abandonné") return null;
  return (COLONNES as readonly string[]).includes(d.avancement) ? (d.avancement as Colonne) : "À trier";
}

export function regrouper<T extends Triable>(dossiers: T[]): Record<Colonne, T[]> {
  const out = Object.fromEntries(COLONNES.map((c) => [c, [] as T[]])) as Record<Colonne, T[]>;
  for (const d of dossiers) {
    const c = colonneDe(d);
    if (c) out[c].push(d);
  }
  for (const c of COLONNES) out[c].sort(comparerCartes);
  return out;
}

/** Valeur d'avancement à envoyer à l'API pour une colonne (« À trier » = vide). */
export function avancementDe(c: Colonne): string {
  return c === "À trier" ? "" : c;
}
