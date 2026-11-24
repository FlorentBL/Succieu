// Modèle du module « Espace Bureau » : fonctions pures qui modifient un SuiviData en mémoire.
// La persistance (écriture atomique, journal) est dans store.ts.
import { randomBytes } from "node:crypto";
import { AppError } from "../content/errors";
import { AVANCEMENTS, PRIORITES } from "./types";
import type { Acteur, Dossier, DossierInput, Listes, Noms, Nouvelle, Statut, SuiviData } from "./types";
import { cleanMultiline, cleanText, extractCertainDate, ISO_DATE, normalizeText } from "./text";

export const DEFAULT_LISTES: Listes = {
  commissions: [],
  decisionsAttendues: ["Information", "Commission", "Bureau", "Conseil municipal", "Validation extérieure"],
  blocages: ["Aucun", "Devis", "Organisme extérieur", "Décision", "Informations"],
};

export function emptyData(): SuiviData {
  return { version: 1, dossiers: [], listes: structuredClone(DEFAULT_LISTES) };
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("base64url")}`;
}

const MAX = { titre: 200, court: 120, long: 2000, nouvelle: 4000 };

function limit(champ: string, valeur: string, max: number): string {
  if (valeur.length > max) throw new AppError("validation_failed", `${champ} : ${max} caractères au maximum.`);
  return valeur;
}

/** Retrouve la graphie officielle d'une valeur de liste, sans tenir compte des accents ni de la casse. */
export function matchInList(valeur: string, liste: readonly string[]): string | null {
  const n = normalizeText(valeur);
  return liste.find((v) => normalizeText(v) === n) ?? null;
}

export function matchPriorite(valeur: string): string | null {
  const n = normalizeText(valeur);
  if (!n) return "";
  return PRIORITES.find((p) => normalizeText(p) === n || normalizeText(p).split(" ")[0] === n) ?? null;
}

export function matchAvancement(valeur: string): string | null {
  const n = normalizeText(valeur);
  if (!n) return "";
  return matchInList(valeur, AVANCEMENTS);
}

/** Une échéance saisie : date ISO conservée, date précise reconnue convertie en ISO, sinon libellé nettoyé. */
export function normalizeEcheance(valeur: string): string {
  const v = cleanText(valeur);
  if (ISO_DATE.test(v)) return v;
  return extractCertainDate(v) ?? v;
}

function statutDepuisAvancement(avancement: string): Statut {
  if (avancement === "Terminé") return "termine";
  if (avancement === "Abandonné") return "abandonne";
  return "actif";
}

function str(v: unknown, champ: string): string {
  if (typeof v !== "string") throw new AppError("validation_failed", `${champ} : texte attendu.`);
  return v;
}

/** Valide un jeu de champs et l'applique sur `cible`. Ne touche ni aux dates ni à la révision. */
function appliquer(data: SuiviData, cible: Dossier, input: DossierInput, noms: Noms, options: { creerCommission?: boolean } = {}): void {
  if (input.titre !== undefined) {
    const titre = limit("Titre", cleanText(str(input.titre, "Titre")), MAX.titre);
    if (!titre) throw new AppError("validation_failed", "Le titre du dossier est obligatoire.");
    cible.titre = titre;
  }
  if (input.commission !== undefined) {
    const c = cleanText(str(input.commission, "Commission"));
    if (!c) cible.commission = "";
    else {
      const m = matchInList(c, data.listes.commissions);
      if (m) cible.commission = m;
      else if (options.creerCommission) {
        data.listes.commissions.push(c);
        cible.commission = c;
      } else throw new AppError("validation_failed", `Commission inconnue : « ${c} ». Ajoutez-la d'abord à la liste des commissions.`);
    }
  }
  if (input.referents !== undefined) {
    if (!Array.isArray(input.referents)) throw new AppError("validation_failed", "Référents : liste attendue.");
    const ids: string[] = [];
    for (const r of input.referents) {
      const id = str(r, "Référent");
      if (!(id in noms)) throw new AppError("validation_failed", `Référent inconnu : « ${id} ».`);
      if (!ids.includes(id)) ids.push(id);
    }
    cible.referents = ids;
  }
  if (input.priorite !== undefined) {
    const p = matchPriorite(cleanText(str(input.priorite, "Priorité")));
    if (p === null) throw new AppError("validation_failed", `Priorité inconnue (attendu : ${PRIORITES.join(", ")}).`);
    cible.priorite = p;
  }
  if (input.blocage !== undefined) cible.blocage = limit("Blocage", cleanText(str(input.blocage, "Blocage")), MAX.court);
  if (input.decisionAttendue !== undefined) cible.decisionAttendue = limit("Décision attendue", cleanText(str(input.decisionAttendue, "Décision attendue")), MAX.court);
  if (input.prochaineAction !== undefined) cible.prochaineAction = limit("Prochaine action", cleanMultiline(str(input.prochaineAction, "Prochaine action")), MAX.long);
  if (input.echeance !== undefined) cible.echeance = limit("Échéance", normalizeEcheance(str(input.echeance, "Échéance")), MAX.court);
  if (input.origine !== undefined) cible.origine = limit("Origine", cleanText(str(input.origine, "Origine")), MAX.court);
  if (input.aVoirEnBureau !== undefined) {
    if (typeof input.aVoirEnBureau !== "boolean") throw new AppError("validation_failed", "« À voir en bureau » : vrai ou faux attendu.");
    cible.aVoirEnBureau = input.aVoirEnBureau;
  }
  // Avancement et statut restent cohérents : Terminé/Abandonné ⇔ statut termine/abandonne.
  if (input.statut !== undefined) {
    if (input.statut !== "actif" && input.statut !== "termine" && input.statut !== "abandonne") throw new AppError("validation_failed", "Statut inconnu (actif, termine, abandonne).");
    cible.statut = input.statut;
    if (input.statut === "termine") cible.avancement = "Terminé";
    else if (input.statut === "abandonne") cible.avancement = "Abandonné";
    else if (statutDepuisAvancement(cible.avancement) !== "actif" && input.avancement === undefined) cible.avancement = "";
  }
  if (input.avancement !== undefined) {
    const a = matchAvancement(cleanText(str(input.avancement, "Avancement")));
    if (a === null) throw new AppError("validation_failed", `Avancement inconnu (attendu : ${AVANCEMENTS.join(", ")}).`);
    if (input.statut === undefined || statutDepuisAvancement(a) === input.statut) {
      cible.avancement = a;
      cible.statut = statutDepuisAvancement(a);
    }
  }
}

export function creerDossier(data: SuiviData, input: DossierInput, noms: Noms, now = new Date(), options: { creerCommission?: boolean; importKey?: string } = {}): Dossier {
  const d: Dossier = {
    id: newId("d"),
    titre: "",
    commission: "",
    referents: [],
    priorite: "",
    avancement: "",
    blocage: "",
    decisionAttendue: "",
    prochaineAction: "",
    echeance: "",
    origine: "",
    aVoirEnBureau: false,
    statut: "actif",
    creeLe: now.toISOString(),
    modifieLe: now.toISOString(),
    revision: 1,
    nouvelles: [],
  };
  if (!cleanText(input.titre)) throw new AppError("validation_failed", "Le titre du dossier est obligatoire.");
  appliquer(data, d, input, noms, options);
  if (options.importKey) d.importKey = options.importKey;
  data.dossiers.push(d);
  return d;
}

export function trouverDossier(data: SuiviData, id: string): Dossier {
  const d = data.dossiers.find((x) => x.id === id);
  if (!d) throw new AppError("not_found", "Dossier introuvable.");
  return d;
}

/** Modifie un dossier. `revision` (optionnelle) protège contre l'écrasement d'une modification faite entre-temps. */
export function modifierDossier(data: SuiviData, id: string, input: DossierInput, revision: number | undefined, noms: Noms, now = new Date()): { dossier: Dossier; champs: string[] } {
  const d = trouverDossier(data, id);
  if (revision !== undefined && revision !== d.revision) {
    throw new AppError("invalid_transition", "Ce dossier a été modifié par quelqu'un d'autre entre-temps. Rechargez la page.");
  }
  const avant = JSON.stringify(d);
  const champs = Object.keys(input).filter((k) => (input as Record<string, unknown>)[k] !== undefined);
  const copie = structuredClone(d);
  appliquer(data, copie, input, noms);
  if (JSON.stringify(copie) !== avant) {
    Object.assign(d, copie, { modifieLe: now.toISOString(), revision: d.revision + 1 });
  }
  return { dossier: d, champs };
}

export function ajouterNouvelle(data: SuiviData, id: string, texte: string, auteur: Acteur, now = new Date()): Nouvelle {
  const d = trouverDossier(data, id);
  const t = limit("Nouvelle", cleanMultiline(texte), MAX.nouvelle);
  if (!t) throw new AppError("validation_failed", "La nouvelle est vide.");
  const n: Nouvelle = { id: newId("n"), date: now.toISOString(), auteur: auteur.nom, auteurId: auteur.id, texte: t };
  d.nouvelles.push(n);
  d.modifieLe = n.date;
  d.revision += 1;
  return n;
}

export function clore(data: SuiviData, id: string, options: { abandon?: boolean; texte?: string } = {}, auteur: Acteur, now = new Date()): Dossier {
  const d = trouverDossier(data, id);
  d.statut = options.abandon ? "abandonne" : "termine";
  d.avancement = options.abandon ? "Abandonné" : "Terminé";
  d.aVoirEnBureau = false;
  d.modifieLe = now.toISOString();
  d.revision += 1;
  const t = cleanMultiline(options.texte ?? "");
  d.nouvelles.push({ id: newId("n"), date: d.modifieLe, auteur: auteur.nom, auteurId: auteur.id, texte: t || (options.abandon ? "Dossier abandonné." : "Dossier terminé.") });
  return d;
}

export function rouvrir(data: SuiviData, id: string, auteur: Acteur, now = new Date()): Dossier {
  const d = trouverDossier(data, id);
  if (d.statut === "actif") return d;
  d.statut = "actif";
  d.avancement = "";
  d.modifieLe = now.toISOString();
  d.revision += 1;
  d.nouvelles.push({ id: newId("n"), date: d.modifieLe, auteur: auteur.nom, auteurId: auteur.id, texte: "Dossier rouvert." });
  return d;
}

export function basculerBureau(data: SuiviData, id: string, valeur?: boolean, now = new Date()): Dossier {
  const d = trouverDossier(data, id);
  const v = valeur ?? !d.aVoirEnBureau;
  if (v !== d.aVoirEnBureau) {
    d.aVoirEnBureau = v;
    d.modifieLe = now.toISOString();
    d.revision += 1;
  }
  return d;
}

// ---------- Listes ----------

export type ListeNom = keyof Listes;

export function ajouterValeurListe(data: SuiviData, liste: ListeNom, valeur: string): string {
  if (!(liste in data.listes)) throw new AppError("validation_failed", "Liste inconnue.");
  const v = cleanText(valeur);
  if (!v || v.length > 80) throw new AppError("validation_failed", "Valeur invalide.");
  if (matchInList(v, data.listes[liste])) throw new AppError("invalid_transition", `« ${v} » existe déjà.`);
  data.listes[liste].push(v);
  return v;
}

/** Renomme une valeur de liste ; pour les commissions, les dossiers suivent. */
export function renommerValeurListe(data: SuiviData, liste: ListeNom, ancienne: string, nouvelle: string): string {
  const L = data.listes[liste];
  if (!L) throw new AppError("validation_failed", "Liste inconnue.");
  const i = L.findIndex((x) => x === ancienne);
  if (i < 0) throw new AppError("not_found", "Valeur introuvable.");
  const v = cleanText(nouvelle);
  if (!v || v.length > 80) throw new AppError("validation_failed", "Valeur invalide.");
  if (L.some((x, j) => j !== i && normalizeText(x) === normalizeText(v))) throw new AppError("invalid_transition", `« ${v} » existe déjà.`);
  L[i] = v;
  if (liste === "commissions") for (const d of data.dossiers) if (d.commission === ancienne) d.commission = v;
  if (liste === "blocages") for (const d of data.dossiers) if (d.blocage === ancienne) d.blocage = v;
  if (liste === "decisionsAttendues") for (const d of data.dossiers) if (d.decisionAttendue === ancienne) d.decisionAttendue = v;
  return v;
}

/** Supprime une valeur de liste, sauf si un dossier l'utilise encore. */
export function supprimerValeurListe(data: SuiviData, liste: ListeNom, valeur: string): void {
  const L = data.listes[liste];
  if (!L) throw new AppError("validation_failed", "Liste inconnue.");
  const i = L.indexOf(valeur);
  if (i < 0) throw new AppError("not_found", "Valeur introuvable.");
  const champ = liste === "commissions" ? "commission" : liste === "blocages" ? "blocage" : "decisionAttendue";
  const n = data.dossiers.filter((d) => d[champ] === valeur).length;
  if (n > 0) throw new AppError("invalid_transition", `« ${valeur} » est encore utilisé par ${n} dossier(s).`);
  L.splice(i, 1);
}

// ---------- Recherche ----------

export type Filtre = { statut?: Statut | "tous"; commission?: string; referent?: string; aVoirEnBureau?: boolean; q?: string };

export function filtrerDossiers(data: SuiviData, f: Filtre = {}, noms: Noms = {}): Dossier[] {
  const q = f.q ? normalizeText(f.q) : "";
  const statut = f.statut ?? "actif";
  return data.dossiers
    .filter((d) => statut === "tous" || d.statut === statut)
    .filter((d) => !f.commission || d.commission === f.commission)
    .filter((d) => !f.referent || d.referents.includes(f.referent))
    .filter((d) => f.aVoirEnBureau === undefined || d.aVoirEnBureau === f.aVoirEnBureau)
    .filter((d) => {
      if (!q) return true;
      const nomsRef = d.referents.map((id) => noms[id] ?? "").join(" ");
      const hay = normalizeText([d.titre, d.commission, nomsRef, d.prochaineAction, d.origine, d.echeance, d.blocage, ...d.nouvelles.map((n) => n.texte)].join(" "));
      return q.split(" ").every((m) => hay.includes(m));
    })
    .sort((a, b) => (a.priorite || "Z").localeCompare(b.priorite || "Z") || a.titre.localeCompare(b.titre, "fr"));
}
