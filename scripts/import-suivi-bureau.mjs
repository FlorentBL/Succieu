#!/usr/bin/env node
// Import idempotent du suivi de suivi.succieu.fr (bureau.json) dans DATA_DIR/espace-bureau.json.
// Usage : DATA_DIR=<dossier du hub> node scripts/import-suivi-bureau.mjs <bureau.json> [--map correspondances.json] [--dry-run]
//   --map     { "<id ou nom de l'élu>": "<id ou identifiant du compte>" | null } pour les cas ambigus (null = pas de compte)
//   --dry-run n'écrit rien ; affiche seulement le rapport (décomptes, élus rapprochés ou non).
// Le fichier source contient des données réelles : ne jamais le versionner ni le copier dans le dépôt.
import "./ts-resolve.mjs";
import { promises as fs } from "node:fs";

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const mapIdx = args.indexOf("--map");
const mapFile = mapIdx >= 0 ? args[mapIdx + 1] : null;
const source = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--map");
if (!source) {
  console.error("Usage : node scripts/import-suivi-bureau.mjs <bureau.json> [--map correspondances.json] [--dry-run]");
  process.exit(2);
}

const { importerSuivi, formaterRapport } = await import("../lib/suivi/import.ts");
const { dataFile, readData } = await import("../lib/suivi/store.ts");
const { listUsers } = await import("../lib/hub/users.ts");
const { withLock, writeJson } = await import("../lib/content/storage.ts");
const { audit } = await import("../lib/hub/audit.ts");

const lire = async (f) => JSON.parse(await fs.readFile(f, "utf8"));
const ancien = await lire(source);
const table = mapFile ? await lire(mapFile) : {};
const comptes = (await listUsers()).filter((u) => u.active).map((u) => ({ id: u.id, identifier: u.identifier, displayName: u.displayName }));

const rapport = await withLock(dataFile(), async () => {
  const { data, rapport } = importerSuivi(ancien, comptes, await readData(), table);
  if (!dry) await writeJson(dataFile(), data);
  return rapport;
});
console.log(formaterRapport(rapport, dry));
if (!dry) {
  await audit({ actor: "script", action: "bureau.import", detail: `${rapport.dossiersImportes} dossiers, ${rapport.nouvellesImportees} nouvelles` });
  console.log(`Écrit : ${dataFile()}`);
}
