#!/usr/bin/env node
// Génère une empreinte scrypt pour BUREAU_PASSWORD_HASH / ADMIN_PASSWORD_HASH.
// Usage : node scripts/hash-password.mjs            (saisie masquée)
//         printf '%s' 'mot de passe' | node scripts/hash-password.mjs
// Format : scrypt$N$r$p$sel(base64)$empreinte(base64) — voir lib/auth/password.ts
import { randomBytes, scryptSync } from "node:crypto";

const N = 16384, R = 8, P = 1, KEYLEN = 64;

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
if (password.length < 10) {
  console.error("Mot de passe trop court (10 caractères minimum).");
  process.exit(1);
}
const salt = randomBytes(16);
const key = scryptSync(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
console.log(`scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`);
