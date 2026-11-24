// Import (migration) de l'ancienne appli suivi.succieu.fr : bureau.json → espace-bureau.json.
// Pur : lit des objets, rend des objets et un rapport ; les fichiers sont gérés par scripts/import-suivi-bureau.mjs.
import { normalizeText } from "./text";
import { emptyData, matchInList } from "./model";
import type { Dossier, Nouvelle, SuiviData } from "./types";

export type AncienElu = { id: string; nom: string; actif?: boolean };
export type AncienBureau = { version?: number; dossiers?: Dossier[]; elus?: AncienElu[]; listes?: Partial<SuiviData["listes"]> };
export type CompteHub = { id: string; identifier: string; displayName: string };

/** Table de correspondance explicite : id ou nom de l'élu → id ou identifiant du compte (null = volontairement sans compte). */
export type Correspondance = Record<string, string | null>;

export type Rapport = {
  dossiersSource: number;
  dossiersImportes: number;
  dossiersDejaPresents: number;
  nouvellesImportees: number;
  rapproches: { elu: string; compte: string; methode: "table" | "nom" | "prenom" }[];
  nonRapproches: { elu: string; raison: "aucun compte" | "plusieurs comptes" | "ignore par la table"; dossiers: number }[];
  commissionsAjoutees: number;
  /** Dossiers déjà présents dont des référents ont pu être rattachés à un compte créé depuis (rien d'autre n'est modifié). */
  referentsCompletes: number;
};

type Resolution = { compte: CompteHub | null; methode?: "table" | "nom" | "prenom"; raison?: "aucun compte" | "plusieurs comptes" | "ignore par la table" };

/** Rapproche un élu d'un compte : table, puis nom complet normalisé, puis prénom (identifiant) s'il est unique. */
export function rapprocher(elu: AncienElu, comptes: CompteHub[], table: Correspondance = {}): Resolution {
  const cle = [elu.id, elu.nom].find((k) => k in table);
  if (cle !== undefined) {
    const v = table[cle];
    if (v === null) return { compte: null, raison: "ignore par la table" };
    const c = comptes.find((x) => x.id === v || x.identifier === v);
    return c ? { compte: c, methode: "table" } : { compte: null, raison: "aucun compte" };
  }
  const n = normalizeText(elu.nom);
  const exacts = comptes.filter((c) => normalizeText(c.displayName) === n);
  if (exacts.length === 1) return { compte: exacts[0], methode: "nom" };
  if (exacts.length > 1) return { compte: null, raison: "plusieurs comptes" };
  const prenom = n.split(" ")[0];
  const parPrenom = comptes.filter((c) => normalizeText(c.identifier) === prenom || normalizeText(c.displayName).split(" ")[0] === prenom);
  if (parPrenom.length === 1) return { compte: parPrenom[0], methode: "prenom" };
  return { compte: null, raison: parPrenom.length > 1 ? "plusieurs comptes" : "aucun compte" };
}

/**
 * Fusionne l'ancien suivi dans `cible` (modifiée sur place, copie recommandée par l'appelant).
 * Idempotent : un dossier dont l'id existe déjà n'est jamais écrasé (les modifications faites dans le hub sont conservées).
 * Dates, révisions, identifiants et historique des nouvelles sont conservés tels quels.
 */
export function importerSuivi(source: AncienBureau, comptes: CompteHub[], cible: SuiviData = emptyData(), table: Correspondance = {}): { data: SuiviData; rapport: Rapport } {
  const elus = source.elus ?? [];
  const resolutions = new Map(elus.map((e) => [e.id, { elu: e, ...rapprocher(e, comptes, table) }]));
  const rapport: Rapport = { dossiersSource: 0, dossiersImportes: 0, dossiersDejaPresents: 0, nouvellesImportees: 0, rapproches: [], nonRapproches: [], commissionsAjoutees: 0, referentsCompletes: 0 };
  const compteDeNom = (nom: string) => comptes.find((c) => normalizeText(c.displayName) === normalizeText(nom));

  const nonRapp = new Map<string, number>();
  const ids = new Set(cible.dossiers.map((d) => d.id));
  const cles = new Set(cible.dossiers.map((d) => d.importKey).filter(Boolean));
  for (const d of source.dossiers ?? []) {
    rapport.dossiersSource++;
    if (ids.has(d.id) || (d.importKey && cles.has(d.importKey))) {
      rapport.dossiersDejaPresents++;
      // Rattrapage : un référent resté sans compte lors d'un import précédent est rattaché si son compte existe maintenant.
      const existant = cible.dossiers.find((x) => x.id === d.id);
      if (existant?.anciensReferents?.length) {
        const restants: string[] = [];
        for (const nom of existant.anciensReferents) {
          const r = [...resolutions.values()].find((x) => x.elu.nom === nom);
          if (r?.compte) {
            if (!existant.referents.includes(r.compte.id)) existant.referents.push(r.compte.id);
          } else restants.push(nom);
        }
        if (restants.length !== existant.anciensReferents.length) {
          rapport.referentsCompletes++;
          if (restants.length) existant.anciensReferents = restants;
          else delete existant.anciensReferents;
        }
      }
      continue;
    }
    const copie = structuredClone(d);
    const refs: string[] = [];
    const anciens: string[] = [];
    for (const rid of d.referents ?? []) {
      const r = resolutions.get(rid);
      if (r?.compte) {
        if (!refs.includes(r.compte.id)) refs.push(r.compte.id);
      } else {
        const nom = r?.elu.nom ?? rid;
        anciens.push(nom);
        nonRapp.set(nom, (nonRapp.get(nom) ?? 0) + 1);
      }
    }
    copie.referents = refs;
    if (anciens.length) copie.anciensReferents = anciens;
    copie.nouvelles = (d.nouvelles ?? []).map((n): Nouvelle => {
      const c = compteDeNom(n.auteur);
      return c ? { ...n, auteurId: c.id } : { ...n };
    });
    rapport.nouvellesImportees += copie.nouvelles.length;
    cible.dossiers.push(copie);
    ids.add(copie.id);
    rapport.dossiersImportes++;
  }
  for (const k of ["commissions", "decisionsAttendues", "blocages"] as const) {
    for (const v of source.listes?.[k] ?? []) {
      if (!matchInList(v, cible.listes[k])) {
        cible.listes[k].push(v);
        if (k === "commissions") rapport.commissionsAjoutees++;
      }
    }
  }
  for (const { elu, compte, methode, raison } of resolutions.values()) {
    if (compte && methode) rapport.rapproches.push({ elu: elu.nom, compte: compte.displayName, methode });
    else rapport.nonRapproches.push({ elu: elu.nom, raison: raison ?? "aucun compte", dossiers: nonRapp.get(elu.nom) ?? 0 });
  }
  return { data: cible, rapport };
}

/** Rapport lisible (aucun nom de dossier ni contenu, seulement des décomptes et les noms d'élus à rapprocher). */
export function formaterRapport(r: Rapport, dry: boolean): string {
  const l = [
    `${dry ? "[SIMULATION] " : ""}Dossiers dans la source : ${r.dossiersSource}`,
    `  importés : ${r.dossiersImportes} · déjà présents (conservés) : ${r.dossiersDejaPresents}`,
    `  nouvelles importées : ${r.nouvellesImportees} · commissions ajoutées : ${r.commissionsAjoutees} · référents rattachés a posteriori : ${r.referentsCompletes}`,
    `Élus rapprochés (${r.rapproches.length}) :`,
    ...r.rapproches.map((x) => `  ${x.elu} → ${x.compte} (${x.methode})`),
    `Référents NON rapprochés (${r.nonRapproches.length}) :`,
    ...r.nonRapproches.map((x) => `  ${x.elu} — ${x.raison} — ${x.dossiers} dossier(s) (nom conservé dans anciensReferents)`),
  ];
  if (r.nonRapproches.length) l.push("Pour les rapprocher : créer le compte dans l'administration, ou fournir --map correspondances.json, puis relancer : les référents restés sans compte sont rattachés, rien d'autre n'est modifié.");
  return l.join("\n");
}
