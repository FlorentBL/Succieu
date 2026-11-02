import test from "node:test";
import assert from "node:assert/strict";
import { validateReview, buildDiscordPayload, truncate, submitReview, notify, show, main } from "./cli.mjs";

const ID = "a-0123456789abcdef";
const env = { SUCCIEU_BASE_URL: "https://x.test", REVIEW_API_TOKEN: "t".repeat(24), DISCORD_WEBHOOK_URL: "https://discord.test/hook" };
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const good = { ok: false, issues: ["Faute"], corrected: { title: "T" }, summary: "Résumé" };

test("validateReview", () => {
  assert.deepEqual(validateReview(good), []);
  assert.ok(validateReview(null).length);
  assert.ok(validateReview({ ...good, ok: "oui" }).length);
  assert.ok(validateReview({ ...good, issues: [""] }).length);
  assert.ok(validateReview({ ...good, summary: " " }).length);
  assert.ok(validateReview({ ...good, corrected: {} }).length);
  assert.ok(validateReview({ ...good, corrected: [] }).length);
});

test("submit-review : validation avant envoi, aucun appel si invalide", async () => {
  let called = 0;
  const fetchFn = async () => { called++; return json({}); };
  await assert.rejects(submitReview(ID, "f.json", { env, fetchFn, readFileFn: async () => '{"ok":1}' }), /Avis invalide/);
  await assert.rejects(submitReview(ID, "f.json", { env, fetchFn, readFileFn: async () => "pas json" }), /illisible/);
  assert.equal(called, 0);
});

test("submit-review : POST avec Bearer et champs filtrés", async () => {
  let req;
  const fetchFn = async (url, opt) => { req = { url, opt }; return json({ submission: {} }); };
  await submitReview(ID, "f.json", { env, fetchFn, readFileFn: async () => JSON.stringify({ ...good, extra: 1 }) });
  assert.equal(req.url, `https://x.test/api/review/submissions/${ID}`);
  assert.equal(req.opt.method, "POST");
  assert.deepEqual(Object.keys(JSON.parse(req.opt.body)).sort(), ["corrected", "issues", "ok", "summary"]);
});

test("erreur API : message avec code et champs", async () => {
  const fetchFn = async () => json({ error: { code: "validation_failed", message: "x", fields: { "corrected.date": "passée" } } }, 422);
  await assert.rejects(submitReview(ID, "f", { env, fetchFn, readFileFn: async () => JSON.stringify(good) }), /422 validation_failed.*corrected\.date/);
});

test("identifiant invalide refusé", async () => {
  await assert.rejects(show("../x", { env, fetchFn: async () => json({}) }), /Identifiant invalide/);
});

test("truncate", () => {
  assert.equal(truncate("abc", 5), "abc");
  assert.equal(truncate("a".repeat(10), 5).length, 5);
  assert.ok(truncate("a".repeat(10), 5).endsWith("…"));
});

test("message Discord : contenu, lien, mentions désactivées, troncature", () => {
  const sub = { id: ID, kind: "article", author: "Jeanne", original: { title: "Orig" }, review: { ok: false, issues: ["a", "b", "c"], summary: "Bref", corrected: { title: "Titre" } } };
  const p = buildDiscordPayload(sub, "https://x.test/");
  assert.deepEqual(p.allowed_mentions, { parse: [] });
  assert.match(p.content, /Actualité.*Jeanne.*Titre/);
  assert.ok(p.content.includes(`https://x.test/espace-bureau/moderation/${ID}`));
  assert.ok(!p.content.includes("• c"));
  const big = buildDiscordPayload({ ...sub, author: "@everyone".repeat(500), review: { ok: true, issues: ["z".repeat(5000)], summary: "s".repeat(5000) } }, "https://x.test");
  assert.ok(big.content.length <= 2000);
});

test("notify : lit la saisie puis poste sur le webhook", async () => {
  const calls = [];
  const fetchFn = async (url, opt) => {
    calls.push(url);
    return url === env.DISCORD_WEBHOOK_URL ? { ok: true, status: 204 } : json({ submission: { id: ID, kind: "event", author: "A", original: { title: "Fête" } } });
  };
  assert.match(await notify(ID, { env, fetchFn }), /envoyée/);
  assert.equal(calls.length, 2);
  await assert.rejects(notify(ID, { env: { ...env, DISCORD_WEBHOOK_URL: "" }, fetchFn }), /DISCORD_WEBHOOK_URL/);
  await assert.rejects(notify(ID, { env, fetchFn: async (u) => (u === env.DISCORD_WEBHOOK_URL ? { ok: false, status: 429 } : json({ submission: { id: ID, kind: "event", author: "A", original: {} } })) }), /429/);
});

test("main : usage", async () => {
  await assert.rejects(main([]), /Usage/);
});
