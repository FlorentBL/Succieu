#!/usr/bin/env node
// Parcours complet du hub sur les VRAIES routes HTTP (aucun navigateur, aucune dépendance) :
// admin crée un compte, connexion avec le provisoire, changement forcé, droits lecture/écriture
// par module, reset. Serveur `next start` éphémère sur un port libre, DATA_DIR temporaire,
// comptes fictifs ; le serveur est arrêté et les données effacées en toute circonstance.
// Prérequis : `next build` fait. Usage : node scripts/e2e-hub.mjs
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = process.env.E2E_PORT ?? "3459";
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = mkdtempSync(path.join(os.tmpdir(), "succieu-e2e-hub-"));
const ADMIN_PW = "admin-e2e-fictif-123";
execFileSync("node", ["scripts/hub-create-admin.mjs", "admin", "Admin Fictif"], { input: ADMIN_PW, env: { ...process.env, DATA_DIR: dataDir } });

const server = spawn("npx", ["next", "start", "-p", PORT, "-H", "127.0.0.1"], {
  env: { ...process.env, NODE_ENV: "production", DATA_DIR: dataDir, SESSION_SECRET: "e2e-session-secret-fictif-0123456789abcdef", REVIEW_API_TOKEN: "e2e-review-token-fictif-0123456789", SITE_ORIGINS: BASE },
  stdio: "ignore",
  detached: true,
});
const stop = () => {
  try { process.kill(-server.pid, "SIGTERM"); } catch {}
  rmSync(dataDir, { recursive: true, force: true });
};
process.on("exit", stop);

async function req(method, url, { body, cookie, redirect } = {}) {
  const r = await fetch(BASE + url, {
    method,
    redirect: redirect ?? "manual",
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(method !== "GET" ? { Origin: BASE } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  // Cookie Secure : en HTTP local on le rejoue à la main.
  const sc = r.headers.get("set-cookie");
  return { status: r.status, json, text, location: r.headers.get("location"), cookie: sc ? sc.split(";")[0] : null };
}

let failed = 0;
const step = async (name, fn) => {
  try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e.message}`); }
};

try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${BASE}/api/hub/session`)).status === 401) break; } catch {}
    await new Promise((r) => setTimeout(r, 500));
    if (i === 79) throw new Error("serveur indisponible (build fait ?)");
  }
  let admin, camille, tmp;
  await step("pages publiques 200 et contrôles sans cookie", async () => {
    for (const p of ["/", "/actualites", "/agenda", "/espace-bureau/connexion"]) assert.equal((await req("GET", p)).status, 200, p);
    assert.equal((await req("GET", "/api/hub/session")).status, 401);
    assert.equal((await req("GET", "/api/bureau/submissions")).status, 401);
    assert.equal((await req("GET", "/api/admin/users")).status, 401);
    const adm = await req("GET", "/espace-bureau/administration");
    assert.ok([307, 308].includes(adm.status) && /\/espace-bureau\/connexion/.test(adm.location ?? ""), `redirection ${adm.status} ${adm.location}`);
    assert.equal((await req("GET", "/api/bureau/names")).status, 404, "ancienne route supprimée");
    assert.match((await req("GET", "/robots.txt")).text, /Disallow: \/espace-bureau/);
  });
  await step("admin : connexion et création d'un compte", async () => {
    const l = await req("POST", "/api/hub/login", { body: { identifier: "admin", password: ADMIN_PW } });
    assert.equal(l.status, 200); admin = l.cookie;
    const c = await req("POST", "/api/admin/users", { cookie: admin, body: { displayName: "Camille Fictive", rights: { documents: "read" } } });
    assert.equal(c.status, 201);
    tmp = c.json.temporaryPassword; camille = c.json.user.id;
    assert.match(tmp, /^[a-z2-9]{4}(-[a-z2-9]{4}){2}$/);
  });
  let cookie;
  await step("provisoire : connexion, modules refusés, changement forcé", async () => {
    const l = await req("POST", "/api/hub/login", { body: { identifier: "camille", password: tmp } });
    assert.equal(l.status, 200); assert.equal(l.json.mustChangePassword, true); cookie = l.cookie;
    assert.equal((await req("GET", "/api/bureau/submissions", { cookie })).json.error.code, "password_change_required");
    assert.equal((await req("GET", "/api/hub/session", { cookie })).status, 200);
    assert.equal((await req("POST", "/api/hub/password", { cookie, body: { oldPassword: "faux", newPassword: "nouveau-mdp-fictif-1" } })).status, 401);
    const p = await req("POST", "/api/hub/password", { cookie, body: { oldPassword: tmp, newPassword: "nouveau-mdp-fictif-1" } });
    assert.equal(p.status, 200); assert.equal(p.json.mustChangePassword, false);
    assert.equal((await req("GET", "/api/hub/session", { cookie })).status, 401, "ancienne session invalidée");
    cookie = p.cookie;
  });
  await step("droits par module et administration", async () => {
    assert.equal((await req("GET", "/api/bureau/submissions", { cookie })).json.error.code, "forbidden"); // pas de droit actus-agenda
    assert.equal((await req("GET", "/api/admin/users", { cookie })).status, 403);
    assert.equal((await req("PATCH", `/api/admin/users/${camille}`, { cookie: admin, body: { rights: { documents: "read", "actus-agenda": "read", "salle-des-fetes": "write" } } })).status, 200);
    assert.equal((await req("GET", "/api/bureau/submissions", { cookie })).status, 200); // lecture
    assert.equal((await req("POST", "/api/bureau/submissions", { cookie, body: { kind: "article", fields: {} } })).status, 403); // pas d'écriture
    assert.equal((await req("GET", "/api/salle-des-fetes/reservations", { cookie })).status, 200);
    assert.equal((await req("GET", "/api/salle-des-fetes/audit", { cookie })).status, 200);
  });
  await step("reset : session invalidée, nouveau provisoire, changement forcé", async () => {
    const r = await req("POST", `/api/admin/users/${camille}/reset-password`, { cookie: admin });
    assert.equal(r.status, 200);
    assert.equal((await req("GET", "/api/hub/session", { cookie })).status, 401);
    assert.equal((await req("POST", "/api/hub/login", { body: { identifier: "camille", password: "nouveau-mdp-fictif-1" } })).status, 401);
    const l = await req("POST", "/api/hub/login", { body: { identifier: "camille", password: r.json.temporaryPassword } });
    assert.equal(l.json.mustChangePassword, true);
  });
  await step("déconnexion", async () => {
    assert.equal((await req("POST", "/api/hub/logout", { cookie: admin })).status, 200);
  });
} catch (e) {
  failed++;
  console.log(`FAIL ${e.message}`);
} finally {
  stop();
}
console.log(failed ? `\n${failed} échec(s)` : "\nTous les contrôles passent.");
process.exit(failed ? 1 : 0);
