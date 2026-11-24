#!/usr/bin/env node
// LECTURE SEULE : liste les comptes du drive (oCIS) et l'écart avec les comptes du hub (DATA_DIR/users.json).
// À lancer avant la bascule pour savoir quels comptes seront créés ou rattachés. N'écrit rien, ni sur le
// drive ni dans le hub, et n'affiche aucun mot de passe ni jeton.
//
// Usage : DATA_DIR=/var/lib/succieu-web DRIVE_URL=https://drive.succieu.fr DRIVE_ADMIN_USER=admin \
//         DRIVE_ADMIN_PASSWORD=… node scripts/drive-accounts.mjs [--json]
// (le mot de passe vient du fichier d'environnement du service, jamais de la ligne de commande en clair dans un historique)
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

register(new URL("./ts-resolve-hooks.mjs", import.meta.url));

const imp = (p) => import(pathToFileURL(path.resolve(import.meta.dirname, "..", p)).href);
const { driveSyncEnabled, listDriveAccounts, compareAccounts } = await imp("lib/hub/drive-sync.ts");
const { listUsers } = await imp("lib/hub/users.ts");

if (!driveSyncEnabled()) {
  console.error("DRIVE_URL, DRIVE_ADMIN_USER et DRIVE_ADMIN_PASSWORD sont requis (synchro désactivée sans eux).");
  process.exit(2);
}

try {
  const drive = await listDriveAccounts();
  const users = await listUsers();
  const rows = compareAccounts(users, drive);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ drive: drive.length, hub: users.length, rows }, null, 2));
    process.exit(0);
  }
  console.log(`DATA_DIR=${process.env.DATA_DIR ?? "(défaut ./data)"} — ${users.length} comptes hub, ${drive.length} comptes drive\n`);
  const label = {
    ok: "OK",
    "drive-sans-hub": "drive SANS compte hub",
    "hub-sans-drive": "hub SANS compte drive (sera créé à l'attribution du mot de passe)",
    "desactive-hub-seulement": "désactivé dans le hub seulement",
    "desactive-drive-seulement": "désactivé dans le drive seulement",
  };
  for (const r of rows) {
    const hub = r.hub ? `${r.hub.identifier}${r.hub.active ? "" : " (désactivé)"}` : "—";
    const dr = r.drive ? `${r.driveLogin}${r.drive.enabled === false ? " (désactivé)" : ""}` : "—";
    console.log(`${label[r.status].padEnd(66)} hub: ${hub.padEnd(18)} drive: ${dr}`);
  }
  const gaps = rows.filter((r) => r.status !== "ok").length;
  console.log(`\n${gaps === 0 ? "Aucun écart." : `${gaps} écart(s).`} (lecture seule : rien n'a été modifié)`);
} catch (e) {
  console.error(`Échec : ${e?.message ?? e}`);
  process.exit(1);
}
