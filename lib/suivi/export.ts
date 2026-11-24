import { formatDateFr, ISO_DATE } from "./text";
import type { Dossier, Noms, SuiviData } from "./types";
import { writeXlsx } from "./xlsx";
import type { Cell } from "./xlsx";

const ENTETES = ["Sujet / Dossier", "Commission", "Référent(s)", "Priorité", "Avancement", "Blocage", "Décision attendue", "Prochaine action", "Échéance", "Origine", "À voir en bureau", "Dernière nouvelle", "Historique des nouvelles"];
const LARGEURS = [38, 20, 18, 16, 14, 18, 20, 40, 16, 14, 12, 48, 70];

function ligne(d: Dossier, noms: Noms): Cell[] {
  const refs = d.referents.map((id) => noms[id] ?? id).join(", ");
  const fmt = (n: Dossier["nouvelles"][number]) => `${formatDateFr(n.date.slice(0, 10))} — ${n.auteur} : ${n.texte}`;
  const derniere = d.nouvelles.length ? fmt(d.nouvelles[d.nouvelles.length - 1]) : "";
  const echeance: Cell = ISO_DATE.test(d.echeance) ? new Date(`${d.echeance}T00:00:00Z`) : d.echeance;
  return [d.titre, d.commission, refs, d.priorite, d.avancement, d.blocage, d.decisionAttendue, d.prochaineAction, echeance, d.origine, d.aVoirEnBureau ? "Oui" : "", derniere, d.nouvelles.map(fmt).join("\n")];
}

const tri = (a: Dossier, b: Dossier) => (a.priorite || "Z").localeCompare(b.priorite || "Z") || a.titre.localeCompare(b.titre, "fr");

/** Classeur .xlsx : feuille « A faire » (dossiers actifs), « Terminés » (terminés et abandonnés), « Listes ». */
export function exporterXlsx(data: SuiviData, noms: Noms): Buffer {
  const actifs = data.dossiers.filter((d) => d.statut === "actif").sort(tri);
  const finis = data.dossiers.filter((d) => d.statut !== "actif").sort(tri);
  const l = data.listes;
  const hauteur = Math.max(l.commissions.length, l.decisionsAttendues.length, l.blocages.length);
  const listes: Cell[][] = [["Commission", "Décision attendue", "Blocage"]];
  for (let i = 0; i < hauteur; i++) listes.push([l.commissions[i] ?? null, l.decisionsAttendues[i] ?? null, l.blocages[i] ?? null]);
  return writeXlsx([
    { name: "A faire", rows: [ENTETES, ...actifs.map((d) => ligne(d, noms))], widths: LARGEURS },
    { name: "Terminés", rows: [ENTETES, ...finis.map((d) => ligne(d, noms))], widths: LARGEURS },
    { name: "Listes", rows: listes, widths: [24, 24, 24] },
  ]);
}
