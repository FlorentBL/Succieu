import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { AppError } from "../content/errors";
import { echeanceAffichage, enRetard, niveauPriorite, nomsReferents, ordreDuJour, referentsAffichage } from "./affichage";
import { exporterXlsx } from "./export";
import { importerSuivi, rapprocher, type AncienBureau } from "./import";
import { ajouterNouvelle, basculerBureau, clore, creerDossier, emptyData, filtrerDossiers, modifierDossier, normalizeEcheance, rouvrir } from "./model";
import { auditLecture, lireNoms, mutate, readData } from "./store";
import { avancementDe, colonneDe, regrouper } from "./tableau";
import type { Acteur, Noms } from "./types";

// Données entièrement fictives.
const NOMS: Noms = { u1: "Alice Test", u2: "Bruno Exemple" };
const ALICE: Acteur = { id: "u1", nom: "Alice Test", identifier: "alice" };
const NOW = new Date("2026-11-20T10:00:00Z");
const code = (f: () => unknown) => {
  try {
    f();
    return "ok";
  } catch (e) {
    return e instanceof AppError ? e.code : String(e);
  }
};

function base() {
  const data = emptyData();
  data.listes.commissions = ["Voirie", "Finances"];
  return data;
}

test("création : référents = comptes connus, échéance certaine ou libellé", () => {
  const data = base();
  const d = creerDossier(data, { titre: "  Réfection du chemin ", referents: ["u1", "u1", "u2"], priorite: "p1", commission: "voirie", echeance: "15 décembre 2026" }, NOMS, NOW);
  assert.equal(d.titre, "Réfection du chemin");
  assert.deepEqual(d.referents, ["u1", "u2"]);
  assert.equal(d.priorite, "P1 Urgent");
  assert.equal(d.commission, "Voirie");
  assert.equal(d.echeance, "2026-12-15");
  assert.equal(normalizeEcheance("Avril 2027"), "Avril 2027");
  assert.equal(code(() => creerDossier(data, { titre: "x", referents: ["inconnu"] }, NOMS)), "validation_failed");
  assert.equal(code(() => creerDossier(data, { titre: "" }, NOMS)), "validation_failed");
  assert.equal(code(() => creerDossier(data, { titre: "x", commission: "Nouvelle" }, NOMS)), "validation_failed");
});

test("avancement et statut synchronisés ; révision et 409", () => {
  const data = base();
  const d = creerDossier(data, { titre: "A", avancement: "En cours" }, NOMS, NOW);
  assert.equal(d.revision, 1);
  modifierDossier(data, d.id, { avancement: "Terminé" }, 1, NOMS, NOW);
  assert.equal(d.statut, "termine");
  assert.equal(d.revision, 2);
  modifierDossier(data, d.id, { statut: "actif" }, 2, NOMS, NOW);
  assert.equal(d.avancement, "");
  assert.equal(code(() => modifierDossier(data, d.id, { titre: "B" }, 1, NOMS)), "invalid_transition");
  const r = d.revision;
  modifierDossier(data, d.id, { titre: d.titre }, r, NOMS); // aucun changement : pas de nouvelle révision
  assert.equal(d.revision, r);
  assert.equal(code(() => modifierDossier(data, "d_absent", {}, undefined, NOMS)), "not_found");
});

test("nouvelles : auteur = compte connecté ; clore / rouvrir / bureau", () => {
  const data = base();
  const d = creerDossier(data, { titre: "A", aVoirEnBureau: true }, NOMS, NOW);
  const n = ajouterNouvelle(data, d.id, "  Appel au prestataire ", ALICE, NOW);
  assert.equal(n.auteur, "Alice Test");
  assert.equal(n.auteurId, "u1");
  assert.equal(code(() => ajouterNouvelle(data, d.id, "   ", ALICE)), "validation_failed");
  clore(data, d.id, {}, ALICE, NOW);
  assert.equal(d.statut, "termine");
  assert.equal(d.aVoirEnBureau, false);
  rouvrir(data, d.id, ALICE, NOW);
  assert.equal(d.statut, "actif");
  assert.equal(d.nouvelles.length, 3);
  basculerBureau(data, d.id, undefined, NOW);
  assert.equal(d.aVoirEnBureau, true);
});

test("recherche, filtres et tri par priorité", () => {
  const data = base();
  creerDossier(data, { titre: "Toiture église", referents: ["u2"], priorite: "P3" }, NOMS, NOW);
  creerDossier(data, { titre: "Radar", referents: ["u1"], priorite: "P1", commission: "Voirie" }, NOMS, NOW);
  assert.deepEqual(filtrerDossiers(data, {}, NOMS).map((d) => d.titre), ["Radar", "Toiture église"]);
  assert.equal(filtrerDossiers(data, { referent: "u2" }).length, 1);
  assert.equal(filtrerDossiers(data, { q: "bruno" }, NOMS).length, 1); // recherche par nom du référent
  assert.equal(filtrerDossiers(data, { q: "EGLISE" }, NOMS).length, 1);
  assert.equal(filtrerDossiers(data, { commission: "Voirie" }).length, 1);
  assert.equal(nomsReferents(data.dossiers[0], NOMS), "Bruno Exemple");
});

test("affichage : retard seulement pour une date certaine dépassée", () => {
  assert.equal(enRetard({ echeance: "2026-11-01", statut: "actif" }, "2026-11-20"), true);
  assert.equal(enRetard({ echeance: "Avril 2027", statut: "actif" }, "2026-11-20"), false);
  assert.equal(enRetard({ echeance: "2026-11-01", statut: "termine" }, "2026-11-20"), false);
  assert.equal(niveauPriorite("P2 Important"), "important");
  const data = base();
  creerDossier(data, { titre: "Urgent", priorite: "P1" }, NOMS, NOW);
  creerDossier(data, { titre: "Calme", priorite: "P3" }, NOMS, NOW);
  creerDossier(data, { titre: "Marqué", priorite: "P3", aVoirEnBureau: true }, NOMS, NOW);
  assert.deepEqual(ordreDuJour(data.dossiers).map((d) => d.titre), ["Marqué", "Urgent"]);
});

test("tableau : colonnes, « À trier », terminés exclus, tri", () => {
  const g = regrouper([
    { avancement: "", priorite: "P3", echeance: "", titre: "B" },
    { avancement: "En cours", priorite: "P2", echeance: "Avril 2027", titre: "C" },
    { avancement: "En cours", priorite: "P1", echeance: "", titre: "D" },
    { avancement: "En cours", priorite: "P2", echeance: "2026-12-01", titre: "E" },
    { avancement: "Terminé", priorite: "P1", echeance: "", titre: "F", statut: "termine" },
  ]);
  assert.equal(g["À trier"].length, 1);
  assert.deepEqual(g["En cours"].map((d) => d.titre), ["D", "E", "C"]);
  assert.equal(colonneDe({ avancement: "Terminé", statut: "termine" }), null);
  assert.equal(avancementDe("À trier"), "");
});

test("export xlsx : archive ZIP valide avec les trois feuilles", () => {
  const data = base();
  creerDossier(data, { titre: "A" }, NOMS, NOW);
  const buf = exporterXlsx(data, NOMS);
  assert.equal(buf.readUInt32LE(0), 0x04034b50);
  const txt = buf.toString("latin1");
  for (const nom of ["xl/worksheets/sheet1.xml", "xl/worksheets/sheet3.xml", "xl/workbook.xml"]) assert.ok(txt.includes(nom), nom);
});

// ---------- Import ----------

const SOURCE: AncienBureau = {
  version: 1,
  elus: [
    { id: "alice", nom: "Alice Test" },
    { id: "bruno", nom: "Bruno" },
    { id: "zoe", nom: "Zoé Fictive" },
    { id: "cleo", nom: "Cléo" },
  ],
  listes: { commissions: ["Voirie", "Écoles"], decisionsAttendues: ["Bureau"], blocages: [] },
  dossiers: [
    { id: "d_1", titre: "Dossier un", commission: "Voirie", referents: ["alice", "bruno"], priorite: "P1 Urgent", avancement: "En cours", blocage: "", decisionAttendue: "", prochaineAction: "", echeance: "2026-12-15", origine: "", aVoirEnBureau: true, statut: "actif", creeLe: "2026-10-01T08:00:00.000Z", modifieLe: "2026-11-02T09:00:00.000Z", revision: 7, nouvelles: [{ id: "n_1", date: "2026-10-02T08:00:00.000Z", auteur: "Alice Test", texte: "Premier point" }] },
    { id: "d_2", titre: "Dossier deux", commission: "", referents: ["zoe", "cleo"], priorite: "", avancement: "", blocage: "", decisionAttendue: "", prochaineAction: "", echeance: "Avril 2027", origine: "", aVoirEnBureau: false, statut: "actif", creeLe: "2026-10-03T08:00:00.000Z", modifieLe: "2026-10-03T08:00:00.000Z", revision: 1, nouvelles: [] },
  ],
};
const COMPTES = [
  { id: "u1", identifier: "alice", displayName: "Alice Test" },
  { id: "u2", identifier: "bruno", displayName: "Bruno Exemple" },
  { id: "u3", identifier: "cleo", displayName: "Cléo Une" },
  { id: "u4", identifier: "cleo-2", displayName: "Cléo Deux" },
];

test("import : rapprochement par nom, prénom unique, ambiguïté, table", () => {
  assert.equal(rapprocher({ id: "a", nom: "alice test" }, COMPTES).methode, "nom");
  assert.equal(rapprocher({ id: "b", nom: "Bruno" }, COMPTES).compte?.id, "u2");
  assert.equal(rapprocher({ id: "c", nom: "Cléo" }, COMPTES).raison, "plusieurs comptes");
  assert.equal(rapprocher({ id: "z", nom: "Zoé" }, COMPTES).raison, "aucun compte");
  assert.equal(rapprocher({ id: "c", nom: "Cléo" }, COMPTES, { c: "cleo-2" }).compte?.id, "u4");
  assert.equal(rapprocher({ id: "c", nom: "Cléo" }, COMPTES, { Cléo: null }).raison, "ignore par la table");
});

test("import : conserve dates, révisions, historique ; rapport ; idempotent ; rattrapage", () => {
  const cible = emptyData();
  const { data, rapport } = importerSuivi(structuredClone(SOURCE), COMPTES, cible);
  assert.equal(rapport.dossiersImportes, 2);
  assert.equal(rapport.nouvellesImportees, 1);
  assert.equal(rapport.nonRapproches.length, 2); // Zoé (aucun compte), Cléo (ambigu)
  const d1 = data.dossiers[0];
  assert.deepEqual(d1.referents, ["u1", "u2"]);
  assert.equal(d1.revision, 7);
  assert.equal(d1.creeLe, "2026-10-01T08:00:00.000Z");
  assert.equal(d1.nouvelles[0].auteurId, "u1");
  assert.deepEqual(data.dossiers[1].anciensReferents, ["Zoé Fictive", "Cléo"]);
  assert.deepEqual(data.listes.commissions, ["Voirie", "Écoles"]);

  // Modification faite dans le hub, puis nouvel import : rien n'est écrasé.
  d1.titre = "Modifié dans le hub";
  const second = importerSuivi(structuredClone(SOURCE), COMPTES, data);
  assert.equal(second.rapport.dossiersImportes, 0);
  assert.equal(second.rapport.dossiersDejaPresents, 2);
  assert.equal(data.dossiers.length, 2);
  assert.equal(d1.titre, "Modifié dans le hub");

  // Compte créé depuis + table : le référent resté sans compte est rattaché.
  const comptes2 = [...COMPTES, { id: "u5", identifier: "zoe", displayName: "Zoé Fictive" }];
  const third = importerSuivi(structuredClone(SOURCE), comptes2, data, { Cléo: "cleo-2" });
  assert.equal(third.rapport.referentsCompletes, 1);
  assert.deepEqual(data.dossiers[1].referents, ["u5", "u4"]);
  assert.equal(data.dossiers[1].anciensReferents, undefined);
});

// ---------- Stockage ----------

let dir: string;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "succieu-suivi-"));
  process.env.DATA_DIR = dir;
});
after(() => fs.rm(dir, { recursive: true, force: true }));
beforeEach(async () => {
  for (const f of ["espace-bureau.json", "bureau.json", "users.json", "hub-audit.jsonl"]) await fs.rm(path.join(dir, f), { force: true });
});

test("stockage : espace-bureau.json distinct de bureau.json, écritures sérialisées, audit sans contenu sensible", async () => {
  await fs.writeFile(path.join(dir, "bureau.json"), JSON.stringify(["Alice"]));
  await Promise.all(Array.from({ length: 12 }, (_, i) => mutate(ALICE, (data) => ({ result: creerDossier(data, { titre: `Dossier ${i}` }, NOMS), audit: [{ action: "dossier_cree", detail: `Dossier ${i}` }] }))));
  const data = await readData();
  assert.equal(data.dossiers.length, 12);
  assert.equal(new Set(data.dossiers.map((d) => d.id)).size, 12);
  assert.equal(await fs.readFile(path.join(dir, "bureau.json"), "utf8"), '["Alice"]');
  // Une erreur dans la mutation n'écrit rien.
  await assert.rejects(mutate(ALICE, () => { throw new AppError("validation_failed", "non"); }));
  assert.equal((await readData()).dossiers.length, 12);
  await auditLecture(ALICE, "export_xlsx");
  const lignes = (await fs.readFile(path.join(dir, "hub-audit.jsonl"), "utf8")).trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lignes.length, 13);
  assert.ok(lignes.every((l) => l.actor === "alice" && l.action.startsWith("bureau.")));
  assert.deepEqual((await lireNoms()).actifs, []);
});

test("affichage : échéance (date → « Pour le », libellé → « Échéance ») et référents au pluriel / sans compte", () => {
  assert.deepEqual(echeanceAffichage("2026-12-15"), { nom: "Pour le", valeur: "15 décembre 2026", phrase: "Pour le 15 décembre 2026" });
  assert.equal(echeanceAffichage("ASAP")?.phrase, "Échéance : ASAP");
  assert.equal(echeanceAffichage(""), null);
  const noms = { a: "Alice Démo", b: "Bruno Démo" };
  assert.deepEqual(referentsAffichage({ referents: ["a", "b"] }, noms), { label: "Référents", texte: "Alice Démo, Bruno Démo" });
  assert.deepEqual(referentsAffichage({ referents: ["a"] }, noms), { label: "Référent", texte: "Alice Démo" });
  assert.deepEqual(referentsAffichage({ referents: [], anciensReferents: ["Zoé Ancienne"] }, noms), { label: "Référent", texte: "Zoé Ancienne (sans compte)" });
  assert.equal(referentsAffichage({ referents: [] }, noms), null);
});
