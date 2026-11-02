import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "./errors";
import { applyPublish, applyReject, applyReview } from "./transitions";
import type { Submission } from "./types";

const original = { title: "Orig", date: "2026-12-01", place: "Salle", description: "D" };
const corrected = { ...original, title: "Corrigé" };
const base: Submission = {
  id: "e-0123456789abcdef",
  kind: "event",
  author: "Prénom Exemple (fictif)",
  createdAt: "2026-11-02T10:00:00.000Z",
  status: "submitted",
  original,
  history: [{ at: "2026-11-02T10:00:00.000Z", action: "submitted", by: "x" }],
};
const T = "2026-11-03T08:00:00.000Z";
const review = { ok: true, issues: [], summary: "RAS", corrected };

function code(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as AppError).code;
  }
  return "none";
}

test("relecture : submitted -> reviewed, historique ajouté", () => {
  const s = applyReview(base, review, T);
  assert.equal(s.status, "reviewed");
  assert.equal(s.review?.reviewedAt, T);
  assert.equal(s.history.length, 2);
  assert.equal(s.history[1].action, "reviewed");
  assert.equal(base.status, "submitted", "entrée non mutée");
});

test("relecture impossible deux fois", () => {
  assert.equal(code(() => applyReview(applyReview(base, review, T), review, T)), "invalid_transition");
});

test("publication de la version corrigée ou originale", () => {
  const r = applyReview(base, review, T);
  const pc = applyPublish(r, "corrected", T);
  assert.equal(pc.status, "published");
  assert.equal(pc.published?.version, "corrected");
  assert.equal((pc.published?.fields as typeof corrected).title, "Corrigé");
  const po = applyPublish(r, "original", T);
  assert.equal((po.published?.fields as typeof original).title, "Orig");
  assert.equal(po.history.at(-1)?.action, "published");
});

test("publication corrigée sans relecture refusée ; originale possible", () => {
  assert.equal(code(() => applyPublish(base, "corrected", T)), "invalid_transition");
  assert.equal(applyPublish(base, "original", T).status, "published");
  assert.equal(code(() => applyPublish(base, "autre" as never, T)), "validation_failed");
});

test("rejet avec motif ; états terminaux", () => {
  const rj = applyReject(base, "Hors sujet", T);
  assert.equal(rj.status, "rejected");
  assert.equal(rj.rejectionReason, "Hors sujet");
  assert.equal(rj.history.at(-1)?.note, "Hors sujet");
  assert.equal(code(() => applyPublish(rj, "original", T)), "invalid_transition");
  assert.equal(code(() => applyReject(rj, "x", T)), "invalid_transition");
  const pub = applyPublish(base, "original", T);
  assert.equal(code(() => applyReject(pub, "x", T)), "invalid_transition");
  assert.equal(code(() => applyReview(pub, review, T)), "invalid_transition");
});
