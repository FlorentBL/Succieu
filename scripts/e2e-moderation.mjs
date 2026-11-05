#!/usr/bin/env node
// Parcours de modération (Playwright headless, DATA_DIR temporaire, serveur `next start` sur un port libre).
// Prérequis : `next build` fait ; PLAYWRIGHT_CORE = chemin d'un paquet playwright-core installé.
// Usage : PLAYWRIGHT_CORE=/chemin/node_modules/playwright-core node scripts/e2e-moderation.mjs
// Captures : SHOTS_DIR (défaut /tmp/modshots). Aucune donnée réelle : saisies fictives.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? "/tmp/pw/node_modules/playwright-core");

const PORT = process.env.E2E_PORT ?? "3457";
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.SHOTS_DIR ?? "/tmp/modshots";
const ADMIN_PW = "admin-e2e-fictif";
const BUREAU_PW = "bureau-e2e-fictif";
const TOKEN = "e2e-review-token-fictif-0123456789";
const AUTHOR = "Prénom Exemple (fictif)";
const hash = (pw) =>
  execFileSync("node", ["scripts/hash-password.mjs"], { input: pw }).toString().trim();

const dataDir = mkdtempSync(path.join(os.tmpdir(), "succieu-e2e-"));
mkdirSync(SHOTS, { recursive: true });
writeFileSync(path.join(dataDir, "bureau.json"), JSON.stringify([AUTHOR]));

const server = spawn("npx", ["next", "start", "-p", PORT, "-H", "127.0.0.1"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    DATA_DIR: dataDir,
    ADMIN_PASSWORD_HASH: hash(ADMIN_PW),
    BUREAU_PASSWORD_HASH: hash(BUREAU_PW),
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
      if ((await fetch(`${BASE}/api/bureau/session`)).ok) return;
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
  const login = await post("/api/bureau/login", { password: BUREAU_PW });
  assert.equal(login.res.status, 200, "connexion bureau");
  const step1 = login.res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const ident = await post("/api/bureau/identity", { name: AUTHOR }, { Cookie: step1 });
  assert.equal(ident.res.status, 200, "choix du nom");
  const cookie = ident.res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
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
  const page = await ctx.newPage();
  const detailUrl = `${BASE}/espace-bureau/moderation/${art.id}`;

  // Lien direct sans session : connexion, puis retour sur le détail.
  await page.goto(detailUrl);
  await page.getByLabel("Mot de passe administrateur").fill("mauvais");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByRole("alert").filter({ hasText: /\S/ }).first().waitFor();
  await page.getByLabel("Mot de passe administrateur").fill(ADMIN_PW);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByRole("heading", { name: "Fete du village samedi", level: 2 }).waitFor();
  assert.equal(page.url(), detailUrl, "retour sur le détail après connexion");
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
  await page.goto(`${BASE}/espace-bureau/moderation`);
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

  // Déconnexion.
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await page.getByLabel("Mot de passe administrateur").waitFor();

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
  await page.goto(`${BASE}/espace-bureau/moderation/${evt2.id}`);
  await page.getByLabel("Mot de passe administrateur").fill(ADMIN_PW);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.getByRole("heading", { name: "Réunion bureau", level: 2 }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Publier la version corrigée" }).count(), 1);
  await page.screenshot({ path: `${SHOTS}/detail-agenda-relue-390.png`, fullPage: true });
  await page.screenshot({ path: `${SHOTS}/detail-agenda-relue-390-fold.png` });
  const big = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  const p2 = await big.newPage();
  await p2.goto(`${BASE}/espace-bureau/moderation/${art2.id}`);
  await p2.getByLabel("Mot de passe administrateur").fill(ADMIN_PW);
  await p2.getByRole("button", { name: "Se connecter" }).click();
  await p2.getByRole("heading", { name: "Collecte des encombrants", level: 2 }).waitFor();
  await p2.screenshot({ path: `${SHOTS}/detail-1440.png`, fullPage: true });
  await p2.setViewportSize({ width: 1280, height: 800 });
  await p2.screenshot({ path: `${SHOTS}/detail-1280-fold.png` });
  await p2.goto(`${BASE}/espace-bureau/moderation`);
  await p2.getByRole("link", { name: /Collecte des encombrants/ }).waitFor();
  await p2.screenshot({ path: `${SHOTS}/liste-1440.png`, fullPage: true });
  console.log("e2e modération : OK");
} finally {
  await browser?.close();
  server.kill();
  rmSync(dataDir, { recursive: true, force: true });
}
