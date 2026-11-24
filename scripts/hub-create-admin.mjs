#!/usr/bin/env node
// Crée le premier administrateur du hub (DATA_DIR/users.json), mot de passe saisi masqué.
// Usage : DATA_DIR=/var/lib/succieu-web node scripts/hub-create-admin.mjs <prenom> ["Nom affiché"]
//         printf '%s' 'mot de passe' | node scripts/hub-create-admin.mjs <prenom>
// Réutilise lib/hub/users.ts (verrou, écriture atomique, scrypt, journal d'audit).
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";

register(new URL("./ts-resolve-hooks.mjs", import.meta.url));

const [identifier, displayName] = process.argv.slice(2);
if (!identifier) {
  console.error('Usage : node scripts/hub-create-admin.mjs <prenom> ["Nom affiché"]');
  process.exit(2);
}

async function readPassword() {
  if (!process.stdin.isTTY) {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    return data.replace(/\r?\n$/, "");
  }
  return new Promise((resolve) => {
    process.stderr.write("Mot de passe : ");
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let pwd = "";
    stdin.on("data", function onData(ch) {
      for (const c of ch) {
        if (c === "\r" || c === "\n" || c === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stderr.write("\n");
          return resolve(pwd);
        }
        if (c === "\u0003") process.exit(130);
        if (c === "\u007f") pwd = pwd.slice(0, -1);
        else pwd += c;
      }
    });
  });
}

const password = await readPassword();
const { createUser } = await import(pathToFileURL(path.resolve(import.meta.dirname, "../lib/hub/users.ts")).href);
try {
  const { user } = await createUser(
    { identifier, displayName: displayName || identifier, role: "admin", password },
    { actor: "cli" },
  );
  console.log(`Administrateur créé : ${user.identifier} (${user.displayName}).`);
} catch (e) {
  console.error(e?.message ?? e);
  process.exit(1);
}
