#!/usr/bin/env node
// Pose (ou retire avec --off) le droit individuel de modération des actualités et de l'agenda sur un compte du hub.
// Aucun autre droit n'est modifié ; l'administrateur modère toujours. N'appelle JAMAIS le drive.
// Idempotent. Écriture atomique de users.json (mode conservé, 0600 en production) ; l'action est journalisée.
// Usage : DATA_DIR=/var/lib/succieu-web node scripts/hub-set-moderator.mjs <identifiant> [--off]
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { promises as fs } from "node:fs";

register(new URL("./ts-resolve-hooks.mjs", import.meta.url));

const args = process.argv.slice(2);
const off = args.includes("--off");
const [raw] = args.filter((a) => !a.startsWith("--"));
if (!raw) {
  console.error("Usage : node scripts/hub-set-moderator.mjs <identifiant> [--off]");
  process.exit(2);
}
const mod = (f) => import(pathToFileURL(path.resolve(import.meta.dirname, f)).href);
const { normalizeIdentifier } = await mod("../lib/hub/users.ts");
const { dataPath, withLock, writeFileAtomic } = await mod("../lib/content/storage.ts");
const { audit } = await mod("../lib/hub/audit.ts");
try {
  const file = dataPath("users.json");
  const id = normalizeIdentifier(raw);
  const outcome = await withLock(file, async () => {
    const list = JSON.parse(await fs.readFile(file, "utf8"));
    const u = list.find((x) => x.identifier === id);
    if (!u) return "absent";
    if ((u.moderator === true) === !off) return "inchange";
    if (off) delete u.moderator;
    else u.moderator = true;
    u.updatedAt = new Date().toISOString();
    const mode = (await fs.stat(file)).mode & 0o777;
    await writeFileAtomic(file, JSON.stringify(list, null, 2) + "\n", mode);
    return "pose";
  });
  if (outcome === "absent") {
    console.error(`Compte introuvable : ${raw}`);
    process.exit(1);
  }
  if (outcome === "pose") await audit({ actor: "cli", action: "user.update", detail: `${id} moderation=${off ? "non" : "oui"}` });
  console.log(
    outcome === "inchange"
      ? `${id} : droit de modération ${off ? "déjà absent" : "déjà posé"}, rien à changer.`
      : `${id} : droit de modération ${off ? "retiré" : "posé"} (autres droits inchangés).`,
  );
} catch (e) {
  console.error(e?.message ?? e);
  process.exit(1);
}
