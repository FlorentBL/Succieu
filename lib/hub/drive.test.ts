import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_DRIVE_URL, driveUrl, parseDriveUrl } from "./drive";

test("parseDriveUrl : https accepté et normalisé", () => {
  assert.equal(parseDriveUrl("https://drive.exemple.fr"), "https://drive.exemple.fr/");
  assert.equal(parseDriveUrl("  https://drive.exemple.fr/espace  "), "https://drive.exemple.fr/espace");
});

test("parseDriveUrl : refuse http, autres schémas, identifiants, vide, texte libre", () => {
  for (const bad of ["http://drive.exemple.fr", "javascript:alert(1)", "ftp://x.fr", "https://u:p@drive.exemple.fr", "", "   ", "drive.exemple.fr", "https://"]) {
    assert.equal(parseDriveUrl(bad), null, bad);
  }
  assert.equal(parseDriveUrl(undefined), null);
});

test("driveUrl : valeur valide, sinon repli", () => {
  assert.equal(driveUrl({ BUREAU_DRIVE_URL: "https://autre.fr/d" }), "https://autre.fr/d");
  assert.equal(driveUrl({ BUREAU_DRIVE_URL: "http://autre.fr" }), DEFAULT_DRIVE_URL);
  assert.equal(driveUrl({}), DEFAULT_DRIVE_URL);
});
