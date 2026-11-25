import test from "node:test";
import assert from "node:assert/strict";
import { noticeText } from "./notice";

test("noticeText : chaîne non vide conservée", () => {
  assert.equal(noticeText("Compte réactivé.", "ok"), "Compte réactivé.");
});

test("noticeText : vide, undefined ou objet (réponse { user }) → repli", () => {
  assert.equal(noticeText("", "ok"), "ok");
  assert.equal(noticeText(undefined, "ok"), "ok");
  assert.equal(noticeText({ user: { id: "1" } }, "ok"), "ok");
});
