import type { NiveauPriorite } from "@/lib/suivi/affichage";

export const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]";

export const btn = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focus}`;
export const btnPrimary = `${btn} bg-moss-dark text-white hover:bg-moss`;
export const btnGhost = `${btn} border border-ink-subtle/50 bg-surface text-ink hover:bg-pre-pale`;

const PASTILLE: Record<string, string> = {
  urgent: "bg-tuile-pale text-[#8a3320] border-tuile/40",
  important: "bg-colza-pale text-ink border-colza",
  programme: "bg-pre-pale text-ink border-moss/30",
  retard: "bg-tuile text-white border-tuile",
  bureau: "bg-ciel-pale text-ink border-ciel/40",
};

export function Pastille({ type, children }: { type: NiveauPriorite | "retard" | "bureau"; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${PASTILLE[type] ?? ""}`}>{children}</span>;
}

/** Liseré de couleur à gauche d'une carte selon la priorité (texte + couleur : jamais la couleur seule). */
export const LISERE: Record<NiveauPriorite, string> = {
  urgent: "border-l-4 border-l-tuile",
  important: "border-l-4 border-l-colza",
  programme: "border-l-4 border-l-moss",
  aucun: "border-l-4 border-l-border-subtle",
};
