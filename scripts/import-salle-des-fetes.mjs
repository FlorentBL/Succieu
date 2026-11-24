#!/usr/bin/env node
// Import idempotent de l'ancienne appli sdf.succieu.fr vers DATA_DIR/salle-des-fetes/.
// Usage : DATA_DIR=/var/lib/succieu-web node scripts/import-salle-des-fetes.mjs <dossier-data-ancienne-appli> [--dry-run]
// Lit reservations.json et audit-log.json (jamais web-users.json : les comptes sont ceux du hub).
// Une réservation ou un événement déjà présent n'est jamais écrasé : relancer est sans effet.
import { register } from "node:module";
import path from "node:path";

register(new URL("./ts-resolve-hooks.mjs", import.meta.url));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dir = args.find((a) => !a.startsWith("--"));
if (!dir) {
  console.error("Usage : node scripts/import-salle-des-fetes.mjs <dossier-data-ancienne-appli> [--dry-run]");
  process.exit(2);
}

const { importFromLegacy, formatReport } = await import("../lib/salle-des-fetes/import.ts");
try {
  const report = await importFromLegacy(path.resolve(dir), { dryRun });
  console.log(formatReport(report));
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
