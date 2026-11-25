#!/usr/bin/env node
// Règle un compte du hub « sans compte drive » (driveLogin: null) : plus aucune opération drive
// (création, mot de passe, activation, rattachement) pour ce compte. N'appelle JAMAIS le drive.
// Idempotent : relancé sur un compte déjà réglé, il ne change rien.
// Usage : DATA_DIR=/var/lib/succieu-web node scripts/hub-set-no-drive.mjs <identifiant>
//         DATA_DIR=... node scripts/hub-set-no-drive.mjs <identifiant> --restore   (retour au drive = identifiant)
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

register(new URL("./ts-resolve-hooks.mjs", import.meta.url));

const args = process.argv.slice(2);
const restore = args.includes("--restore");
const [raw] = args.filter((a) => !a.startsWith("--"));
if (!raw) {
  console.error("Usage : node scripts/hub-set-no-drive.mjs <identifiant> [--restore]");
  process.exit(2);
}

const mod = (f) => import(pathToFileURL(path.resolve(import.meta.dirname, f)).href);
const { getUserByIdentifier, setDriveState, normalizeIdentifier, driveLoginOf } = await mod("../lib/hub/users.ts");
try {
  const user = await getUserByIdentifier(normalizeIdentifier(raw));
  if (!user) {
    console.error(`Compte introuvable : ${raw}`);
    process.exit(1);
  }
  if (restore) {
    if (driveLoginOf(user) !== null) {
      console.log(`${user.identifier} : déjà rattaché au drive (${driveLoginOf(user)}), rien à changer.`);
    } else {
      await setDriveState(user.id, { driveLogin: user.identifier, driveSync: {} }, { actor: "cli" }, "user.drive-login");
      console.log(`${user.identifier} : drive rétabli (identifiant « ${user.identifier} »). Aucun appel au drive ; la prochaine réinitialisation créera/rattachera le compte.`);
    }
  } else if (driveLoginOf(user) === null) {
    console.log(`${user.identifier} : déjà sans compte drive, rien à changer.`);
  } else {
    await setDriveState(user.id, { driveLogin: null, driveSync: {} }, { actor: "cli" }, "user.drive-login");
    console.log(`${user.identifier} : réglé « pas de compte drive » (le compte drive éventuel n'est pas touché).`);
  }
} catch (e) {
  console.error(e?.message ?? e);
  process.exit(1);
}
