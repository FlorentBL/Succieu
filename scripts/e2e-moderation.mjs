#!/usr/bin/env node
// Parcours de modération (Playwright headless, DATA_DIR temporaire, serveur `next start` sur un port libre).
// Prérequis : `next build` fait ; PLAYWRIGHT_CORE = chemin d'un paquet playwright-core installé.
// Usage : PLAYWRIGHT_CORE=/chemin/node_modules/playwright-core node scripts/e2e-moderation.mjs
// Captures : SHOTS_DIR (défaut /tmp/modshots). Aucune donnée réelle : saisies fictives.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? "/tmp/pw/node_modules/playwright-core");

const PORT = process.env.E2E_PORT ?? "3457";
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.SHOTS_DIR ?? "/tmp/modshots";
const ADMIN_PW = "admin-e2e-fictif-123";
const MEMBER_PW = "membre-e2e-fictif-123";
const TOKEN = "e2e-review-token-fictif-0123456789";
const AUTHOR = "Prénom Exemple (fictif)";
const AUTHOR_ID = "exemple";

const dataDir = mkdtempSync(path.join(os.tmpdir(), "succieu-e2e-"));
mkdirSync(SHOTS, { recursive: true });
// Comptes fictifs du hub (users.json) : un admin et un membre en écriture sur actus-agenda.
const mkUser = (id, name, role) =>
  execFileSync("node", ["scripts/hub-create-admin.mjs", id, name], { input: role === "admin" ? ADMIN_PW : MEMBER_PW, env: { ...process.env, DATA_DIR: dataDir } });
mkUser("admin", "Admin Fictif", "admin");
mkUser(AUTHOR_ID, AUTHOR, "membre"); // le script crée un admin : on le rétrograde en membre (écriture sur actus-agenda)
{
  const f = path.join(dataDir, "users.json");
  const users = JSON.parse(readFileSync(f, "utf8"));
  const m = users.find((u) => u.identifier === AUTHOR_ID);
  m.role = "membre";
  m.rights = { "actus-agenda": "write" };
  writeFileSync(f, JSON.stringify(users));
}

const server = spawn("npx", ["next", "start", "-p", PORT, "-H", "127.0.0.1"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    DATA_DIR: dataDir,
    SESSION_SECRET: "e2e-session-secret-fictif-0123456789abcdef",
    REVIEW_API_TOKEN: TOKEN,
    SITE_ORIGINS: BASE,
  },
  stdio: "ignore",
});
// Cookie Secure : en HTTP local, on les rejoue à la main depuis Set-Cookie.
async function up() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/api/hub/session`)).status === 401) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("serveur indisponible");
}

async function post(url, body, headers = {}) {
  const r = await fetch(BASE + url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE, ...headers },
    body: JSON.stringify(body),
  });
  return { res: r, json: await r.json() };
}

let browser;
try {
  await up();
  const cookieOf = (r) => r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const hubLogin = async (id, pw) => {
    const r = await post("/api/hub/login", { identifier: id, password: pw });
    assert.equal(r.res.status, 200, `connexion ${id}`);
    return cookieOf(r.res);
  };
  const adminCookie = await hubLogin("admin", ADMIN_PW);
  const cookie = await hubLogin(AUTHOR_ID, MEMBER_PW);
  // Un membre n'a pas accès à la modération (403), l'admin oui.
  assert.equal((await fetch(`${BASE}/api/admin/submissions`, { headers: { Cookie: cookie } })).status, 403, "modération interdite au membre");
  assert.equal((await fetch(`${BASE}/api/admin/submissions`, { headers: { Cookie: adminCookie } })).status, 200);
  const sessionCookies = (c) => c.split("; ").map((kv) => { const [name, ...v] = kv.split("="); return { name, value: v.join("="), url: BASE }; });
  const mk = async (kind, fields) => {
    const r = await post("/api/bureau/submissions", { kind, fields }, { Cookie: cookie });
    assert.equal(r.res.status, 201, JSON.stringify(r.json));
    return r.json.submission;
  };
  const art = await mk("article", {
    title: "Fete du village samedi",
    summary: "Venez nombreux a la fete du village, repas et musique.",
    body: "La fete aura lieu samedi sur la place. Repas partage a midi.",
    linkUrl: "/vivre",
    linkLabel: "Voir le programme",
    publishedAt: "2026-11-01",
  });
  const evt = await mk("event", {
    title: "Reunion publique",
    date: "2026-12-05",
    startTime: "18:00",
    endTime: "19:30",
    place: "Salle des fetes",
    description: "Reunion sur les projets de la commune.",
  });
  const rev = await post(
    `/api/review/submissions/${art.id}`,
    {
      ok: false,
      issues: ["Accents manquants dans le titre.", "Le chapeau dépasse la ligne de lecture."],
      summary: "Orthographe et accents corrigés.",
      corrected: {
        title: "Fête du village samedi",
        summary: "Venez nombreux à la fête du village : repas et musique.",
        body: "La fête aura lieu samedi sur la place. Repas partagé à midi.",
        linkUrl: "/vivre",
        linkLabel: "Voir le programme",
        publishedAt: "2026-11-01",
      },
    },
    { Authorization: `Bearer ${TOKEN}` },
  );
  assert.equal(rev.res.status, 200, JSON.stringify(rev.json));

  browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  await ctx.addCookies(sessionCookies(adminCookie));
  const page = await ctx.newPage();
  const detailUrl = `${BASE}/espace-bureau/actualites/moderation/${art.id}`;

  // Ancienne URL : redirigée vers la nouvelle.
  await page.goto(`${BASE}/espace-bureau/moderation/${art.id}`);
  await page.getByRole("heading", { name: "Fete du village samedi", level: 2 }).waitFor();
  assert.equal(page.url(), detailUrl, "redirection de l'ancienne URL");
  assert.match(await page.locator("body").innerText(), /Accents manquants/);
  assert.ok(await page.locator("ins").count(), "différences mises en évidence");
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
  await page.screenshot({ path: `${SHOTS}/detail-390.png`, fullPage: true });

  // Publication de la version corrigée, avec confirmation.
  await page.getByRole("button", { name: "Publier la version corrigée" }).click();
  await page.getByRole("button", { name: "Annuler" }).click();
  await page.getByRole("button", { name: "Publier la version corrigée" }).click();
  await page.getByRole("button", { name: "Confirmer la publication" }).click();
  await page.getByText("Version corrigée publiée sur le site.").waitFor();
  const nextLink = page.getByRole("link", { name: /Saisie suivante/ });
  await nextLink.waitFor();
  assert.match(await nextLink.getAttribute("href"), new RegExp(evt.id));
  const pub = await (await fetch(`${BASE}/api/public/articles`)).json();
  assert.equal(pub.articles?.[0]?.fields?.title ?? pub.articles?.[0]?.title, "Fête du village samedi");

  // Saisie suivante : sans relecture, pas de bouton « version corrigée » ; rejet avec motif.
  await nextLink.click();
  await page.getByRole("heading", { name: "Reunion publique", level: 2 }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Publier la version corrigée" }).count(), 0);
  await page.screenshot({ path: `${SHOTS}/detail-evenement-390.png`, fullPage: true });
  await page.getByRole("button", { name: "Rejeter" }).click();
  assert.ok(await page.getByRole("button", { name: "Confirmer le refus" }).isDisabled(), "motif obligatoire");
  await page.getByLabel(/Motif du refus/).fill("Doublon avec une saisie existante.");
  await page.getByRole("button", { name: "Confirmer le refus" }).click();
  await page.getByText("Saisie refusée.").waitFor();
  await page.getByText("Plus aucune saisie à traiter.").waitFor();

  // Historique.
  await page.goto(`${BASE}/espace-bureau/actualites/moderation`);
  await page.getByText("Rien à traiter pour le moment.").waitFor();
  await page.getByRole("button", { name: "Traitées" }).click();
  await page.getByText("Fête du village samedi").waitFor();
  await page.getByText("Reunion publique").waitFor();
  const body = await page.locator("main").innerText();
  assert.match(body, /Publiée/);
  assert.match(body, /Refusée/);
  await page.screenshot({ path: `${SHOTS}/liste-390.png`, fullPage: true });
  await page.getByRole("link", { name: /Reunion publique/ }).click();
  await page.getByText(/Doublon avec une saisie existante/).first().waitFor();

  // Desktop : nouvelle saisie relue pour la capture 1440.
  const art2 = await mk("article", {
    title: "Collecte des encombrants",
    summary: "La collecte passe le 12 novembre.",
    body: "Sortez vos encombrants la veille au soir.",
    publishedAt: "2026-11-10",
  });
  await post(
    `/api/review/submissions/${art2.id}`,
    {
      ok: true,
      issues: [],
      summary: "RAS.",
      corrected: { title: "Collecte des encombrants", summary: "La collecte passe le 12 novembre 2026.", body: "Sortez vos encombrants la veille au soir.", publishedAt: "2026-11-10" },
    },
    { Authorization: `Bearer ${TOKEN}` },
  );
  const evt2 = await mk("event", {
    title: "Réunion bureau",
    date: "2026-12-10",
    startTime: "18:00",
    endTime: "19:00",
    place: "Mairie",
    description: "Point mensuel du bureau municipal.",
  });
  await post(
    `/api/review/submissions/${evt2.id}`,
    {
      ok: true,
      issues: [],
      summary: "Lieu précisé.",
      corrected: { title: "Réunion bureau", date: "2026-12-10", startTime: "18:00", endTime: "19:00", place: "Mairie, salle du conseil", description: "Point mensuel du bureau municipal." },
    },
    { Authorization: `Bearer ${TOKEN}` },
  );
  await page.goto(`${BASE}/espace-bureau/actualites/moderation/${evt2.id}`);
  await page.getByRole("heading", { name: "Réunion bureau", level: 2 }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Publier la version corrigée" }).count(), 1);
  await page.screenshot({ path: `${SHOTS}/detail-agenda-relue-390.png`, fullPage: true });
  await page.screenshot({ path: `${SHOTS}/detail-agenda-relue-390-fold.png` });
  const big = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await big.addCookies(sessionCookies(adminCookie));
  const p2 = await big.newPage();
  await p2.goto(`${BASE}/espace-bureau/actualites/moderation/${art2.id}`);
  await p2.getByRole("heading", { name: "Collecte des encombrants", level: 2 }).waitFor();
  await p2.screenshot({ path: `${SHOTS}/detail-1440.png`, fullPage: true });
  await p2.setViewportSize({ width: 1280, height: 800 });
  await p2.screenshot({ path: `${SHOTS}/detail-1280-fold.png` });
  await p2.goto(`${BASE}/espace-bureau/actualites/moderation`);
  await p2.getByRole("link", { name: /Collecte des encombrants/ }).waitFor();
  await p2.screenshot({ path: `${SHOTS}/liste-1440.png`, fullPage: true });
  console.log("e2e modération : OK");
} finally {
  await browser?.close();
  server.kill();
  rmSync(dataDir, { recursive: true, force: true });
}
