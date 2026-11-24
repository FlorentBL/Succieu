#!/usr/bin/env node
// Orchestration de la migration vers le hub /espace-bureau :
//   1. comptes individuels (liste fournie HORS dépôt) + fiche imprimable des mots de passe provisoires ;
//   2. import du suivi de suivi.succieu.fr (module Espace Bureau) ;
//   3. import de la salle des fêtes de sdf.succieu.fr.
// Par défaut : simulation (--dry-run), rien n'est écrit. Écriture seulement avec --apply. Idempotent.
//
// Usage :
//   DATA_DIR=<dossier du hub> node scripts/hub-migrate.mjs --users <comptes.json> \
//     [--suivi <bureau.json> [--map correspondances.json]] [--sdf <dossier data de l'ancienne appli>] \
//     [--sheet <fiche.txt>] [--site-url https://succieu.fr] [--reset-all] [--apply]
//   Avec DRIVE_URL, DRIVE_ADMIN_USER et DRIVE_ADMIN_PASSWORD, les comptes du drive sont créés ou rattachés
//   et reçoivent le MÊME mot de passe que le hub. --reset-all : nouveau mot de passe commun aussi pour les
//   comptes déjà présents (bascule). Sans ces variables, seul le hub est migré.
//
// comptes.json : [{ "displayName": "…", "identifier": "…"?, "role": "admin"|"membre"?, "rights": { "<module>": "read"|"write" }? }]
//   "driveLogin" : identifiant du compte drive s'il diffère (ex. « secretariat »).
//   modules : actus-agenda, espace-bureau, salle-des-fetes, documents. Fichier réel : ne jamais le versionner.
// Fiche : écrite UNIQUEMENT avec --apply, en 0600, hors du dépôt (refusée sinon), sans écraser un fichier existant.
// Les mots de passe ne sont jamais affichés ni journalisés.
import { register } from "node:module";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

register(new URL("./ts-resolve-hooks.mjs", import.meta.url));

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
if (flag("--apply") && flag("--dry-run")) {
  console.error("--apply et --dry-run sont exclusifs.");
  process.exit(2);
}
const apply = flag("--apply");
const usersFile = opt("--users");
const suiviFile = opt("--suivi");
const mapFile = opt("--map");
const sdfDir = opt("--sdf");
const resetAll = flag("--reset-all");
const siteUrl = (opt("--site-url") ?? "https://succieu.fr").replace(/\/$/, "");
if (!usersFile) {
  console.error("Usage : node scripts/hub-migrate.mjs --users <comptes.json> [--suivi bureau.json [--map m.json]] [--sdf dossier] [--sheet fiche.txt] [--reset-all] [--apply]");
  process.exit(2);
}

const repo = path.resolve(import.meta.dirname, "..");
const sheetPath = path.resolve(opt("--sheet") ?? path.join(process.env.HOME ?? ".", `fiche-comptes-hub-${new Date().toISOString().slice(0, 10)}.txt`));
if (apply && (sheetPath === repo || sheetPath.startsWith(repo + path.sep))) {
  console.error("La fiche des mots de passe ne doit pas être écrite dans le dépôt : choisir un dossier hors dépôt (--sheet).");
  process.exit(2);
}
const imp = (p) => import(pathToFileURL(path.join(repo, p)).href);
const lire = async (f) => JSON.parse(await fs.readFile(f, "utf8"));

const { parseAccountSpecs, migrateAccounts, formatAccountsReport } = await imp("lib/hub/migrate.ts");
const { listUsers } = await imp("lib/hub/users.ts");
const { audit } = await imp("lib/hub/audit.ts");

console.log(apply ? "== MIGRATION RÉELLE (--apply) ==" : "== SIMULATION (--dry-run, rien n'est écrit) ==");
console.log(`DATA_DIR=${process.env.DATA_DIR ?? "(défaut ./data)"}`);
let failed = false;

// Lecture et validation de TOUT avant la moindre écriture.
let specs, ancienSuivi, table;
try {
  specs = parseAccountSpecs(await lire(usersFile));
  if (suiviFile) {
    ancienSuivi = await lire(suiviFile);
    table = mapFile ? await lire(mapFile) : {};
  }
} catch (e) {
  console.error(`Entrée invalide : ${e?.message ?? e}`);
  process.exit(1);
}

// 1. Comptes
try {
  const driveUrl = process.env.DRIVE_URL ? new URL(process.env.DRIVE_URL).origin : undefined;
  const r = await migrateAccounts(specs, { apply, sheetPath, siteUrl, driveUrl, resetExisting: resetAll });
  console.log(formatAccountsReport(r, apply));
  if (r.failed.length) failed = true;
  if (apply && (r.created.length || r.reset.length)) console.log(`Fiche imprimable : ${sheetPath} (0600) — à imprimer puis effacer.`);
  if (apply) await audit({ actor: "migration", action: "hub.migrate.accounts", detail: `${r.created.length} créés, ${r.reset.length} réinitialisés, ${r.existing.length} déjà présents, ${r.failed.length} échecs` });
} catch (e) {
  console.error(`Comptes : échec — ${e?.message ?? e}`);
  process.exit(1); // pas d'import sans comptes
}

// 2. Suivi du bureau
if (ancienSuivi) {
  try {
    const { importerSuivi, formaterRapport } = await imp("lib/suivi/import.ts");
    const { dataFile, readData } = await imp("lib/suivi/store.ts");
    const { withLock, writeJson } = await imp("lib/content/storage.ts");
    const reels = (await listUsers()).filter((u) => u.active).map((u) => ({ id: u.id, identifier: u.identifier, displayName: u.displayName }));
    // En simulation, les comptes non encore créés sont rapprochables comme s'ils existaient.
    const comptes = apply
      ? reels
      : [...reels, ...specs.filter((s) => !reels.some((u) => u.identifier === s.identifier)).map((s) => ({ id: `simule-${s.identifier}`, identifier: s.identifier, displayName: s.displayName }))];
    const rapport = await withLock(dataFile(), async () => {
      const { data, rapport } = importerSuivi(ancienSuivi, comptes, await readData(), table);
      if (apply) await writeJson(dataFile(), data);
      return rapport;
    });
    console.log(`\nEspace Bureau\n${formaterRapport(rapport, !apply)}`);
    if (apply) await audit({ actor: "migration", action: "bureau.import", detail: `${rapport.dossiersImportes} dossiers, ${rapport.nouvellesImportees} nouvelles` });
  } catch (e) {
    failed = true;
    console.error(`Espace Bureau : échec — ${e?.message ?? e}`);
  }
} else {
  console.log("\nEspace Bureau : ignoré (--suivi absent).");
}

// 3. Salle des fêtes
if (sdfDir) {
  try {
    const { importFromLegacy, formatReport } = await imp("lib/salle-des-fetes/import.ts");
    console.log(`\nSalle des fêtes\n${formatReport(await importFromLegacy(path.resolve(sdfDir), { dryRun: !apply }))}`);
  } catch (e) {
    failed = true;
    console.error(`Salle des fêtes : échec — ${e?.message ?? e}`);
  }
} else {
  console.log("\nSalle des fêtes : ignorée (--sdf absent).");
}

console.log(`\nRésultat global : ${failed ? "ÉCHEC PARTIEL (voir ci-dessus ; relancer est sans danger, tout est idempotent)" : apply ? "terminé" : "simulation terminée, rien n'a été écrit"}.`);
process.exit(failed ? 1 : 0);
