#!/usr/bin/env node
// Pose la catégorie d'affichage (bureau | conseil | secretariat) d'un compte du hub. Simple étiquette :
// aucun droit n'est modifié. N'appelle JAMAIS le drive. Idempotent. Écriture atomique de users.json (mode 0600 conservé).
// Usage : DATA_DIR=/var/lib/succieu-web node scripts/hub-set-category.mjs <identifiant> <bureau|conseil|secretariat>
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { promises as fs } from "node:fs";

register(new URL("./ts-resolve-hooks.mjs", import.meta.url));

const [raw, cat] = process.argv.slice(2);
if (!raw || !cat) {
  console.error("Usage : node scripts/hub-set-category.mjs <identifiant> <bureau|conseil|secretariat>");
  process.exit(2);
}
const mod = (f) => import(pathToFileURL(path.resolve(import.meta.dirname, f)).href);
const { isHubCategory } = await mod("../lib/hub/categories.ts");
const { normalizeIdentifier } = await mod("../lib/hub/users.ts");
const { dataPath, withLock, writeFileAtomic } = await mod("../lib/content/storage.ts");
if (!isHubCategory(cat)) {
  console.error("Catégorie invalide : bureau, conseil ou secretariat.");
  process.exit(2);
}
try {
  const file = dataPath("users.json");
  const id = normalizeIdentifier(raw);
  const outcome = await withLock(file, async () => {
    const list = JSON.parse(await fs.readFile(file, "utf8"));
    const u = list.find((x) => x.identifier === id);
    if (!u) return "absent";
    if (u.category === cat) return "inchange";
    u.category = cat;
    u.updatedAt = new Date().toISOString();
    const mode = (await fs.stat(file)).mode & 0o777; // conserve le mode (0600 en production)
    await writeFileAtomic(file, JSON.stringify(list, null, 2) + "\n", mode);
    return "pose";
  });
  if (outcome === "absent") {
    console.error(`Compte introuvable : ${raw}`);
    process.exit(1);
  }
  console.log(outcome === "inchange" ? `${id} : déjà « ${cat} », rien à changer.` : `${id} : catégorie « ${cat} » posée (droits inchangés).`);
} catch (e) {
  console.error(e?.message ?? e);
  process.exit(1);
}
