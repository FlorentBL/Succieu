import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "./errors";
import { parseArticleFields, parseEventFields, parseReason, parseReview } from "./validation";

const article = {
  title: "Titre",
  summary: "Chapeau",
  body: "Texte complet",
  publishedAt: "2026-11-02",
};
const event = { title: "Réunion", date: "2026-12-01", place: "Salle", description: "Détails" };

function fields(fn: () => unknown): Record<string, string> {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof AppError);
    assert.equal(e.code, "validation_failed");
    return e.fields ?? {};
  }
  assert.fail("validation attendue en échec");
}

test("article valide : champs facultatifs omis, texte nettoyé", () => {
  const out = parseArticleFields({ ...article, title: "  Titre  ", linkUrl: "", extra: 1 });
  assert.deepEqual(out, { ...article });
});

test("article : limites de longueur", () => {
  assert.ok(fields(() => parseArticleFields({ ...article, title: "x".repeat(91) })).title);
  assert.ok(fields(() => parseArticleFields({ ...article, summary: "x".repeat(281) })).summary);
  parseArticleFields({ ...article, title: "x".repeat(90), summary: "x".repeat(280) });
});

test("article : champs obligatoires, date, lien, image", () => {
  const f = fields(() => parseArticleFields({ publishedAt: "2026-02-30", linkUrl: "javascript:alert(1)" }));
  for (const k of ["title", "summary", "body", "publishedAt", "linkUrl"]) assert.ok(f[k], k);
  assert.ok(fields(() => parseArticleFields({ ...article, linkLabel: "Lire" })).linkLabel);
  assert.ok(fields(() => parseArticleFields({ ...article, image: "../../etc/passwd" })).image);
  const ok = parseArticleFields({ ...article, linkUrl: "/vivre", image: "a".repeat(32) + ".webp" });
  assert.equal(ok.linkUrl, "/vivre");
});

test("événement valide, heures facultatives", () => {
  assert.deepEqual(parseEventFields(event), event);
  const e = parseEventFields({ ...event, startTime: "09:30", endTime: "11:00", linkUrl: "https://exemple.fr/x" });
  assert.equal(e.endTime, "11:00");
});

test("événement : heures incohérentes ou mal formées", () => {
  assert.ok(fields(() => parseEventFields({ ...event, startTime: "25:00" })).startTime);
  assert.ok(fields(() => parseEventFields({ ...event, endTime: "10:00" })).endTime);
  assert.ok(fields(() => parseEventFields({ ...event, startTime: "10:00", endTime: "09:00" })).endTime);
  assert.ok(fields(() => parseEventFields({ ...event, date: "2026-13-01" })).date);
  assert.ok(fields(() => parseEventFields(null)) !== undefined);
});

test("avis : structure et version corrigée validée", () => {
  const r = parseReview("event", { ok: false, issues: ["Faute"], summary: "Résumé", corrected: event });
  assert.equal(r.ok, false);
  const f = fields(() => parseReview("event", { ok: "oui", summary: "", corrected: { title: "x" } }));
  assert.ok(f.ok && f.summary && f["corrected.date"]);
});

test("motif de rejet obligatoire", () => {
  assert.ok(fields(() => parseReason("  ")).reason);
  assert.equal(parseReason(" Hors sujet "), "Hors sujet");
});
