import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { isSameOrigin } from "./origin";
import { hashPassword, verifyPassword } from "./password";
import { recordFailure, resetRateLimits, retryAfter } from "./rate-limit";
import { createSessionToken, SESSION_TTL_SECONDS, verifySessionToken } from "./session";

const KEY = "k".repeat(40);

test("empreinte scrypt : vérification et sel aléatoire", async () => {
  const h = await hashPassword("mot de passe test");
  assert.match(h, /^scrypt\$16384\$8\$1\$/);
  assert.ok(await verifyPassword("mot de passe test", h));
  assert.ok(!(await verifyPassword("autre", h)));
  assert.notEqual(h, await hashPassword("mot de passe test"));
  assert.ok(!(await verifyPassword("x", undefined)));
  assert.ok(!(await verifyPassword("x", "n'importe quoi")));
});

test("scripts/hash-password.mjs produit une empreinte vérifiable", async () => {
  const out = execFileSync("node", ["scripts/hash-password.mjs"], { input: "un mot de passe long" }).toString().trim();
  assert.ok(await verifyPassword("un mot de passe long", out));
});

test("session : aller-retour, rôle, expiration, falsification", () => {
  const now = Date.UTC(2026, 10, 2, 10);
  const t = createSessionToken("bureau", "Nom", now, KEY);
  assert.deepEqual(verifySessionToken(t, "bureau", now + 1000, KEY)?.name, "Nom");
  assert.equal(verifySessionToken(t, "admin", now, KEY), null, "rôle différent");
  assert.equal(verifySessionToken(t, "bureau", now + SESSION_TTL_SECONDS * 1000, KEY), null, "expirée");
  assert.equal(verifySessionToken(t, "bureau", now, "z".repeat(40)), null, "autre secret");
  const [p, s] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ role: "bureau", name: "Autre", exp: 9e9 })).toString("base64url");
  assert.equal(verifySessionToken(`${forged}.${s}`, "bureau", now, KEY), null);
  assert.equal(verifySessionToken(`${p}.`, "bureau", now, KEY), null);
  assert.equal(verifySessionToken(undefined, "bureau", now, KEY), null);
});

test("limitation : blocage après 5 échecs, levée après 15 min", () => {
  resetRateLimits();
  const t0 = 1_000_000;
  for (let i = 0; i < 4; i++) recordFailure("1.2.3.4", t0 + i);
  assert.equal(retryAfter("1.2.3.4", t0 + 10), 0);
  recordFailure("1.2.3.4", t0 + 4);
  assert.ok(retryAfter("1.2.3.4", t0 + 10) > 0);
  assert.equal(retryAfter("5.6.7.8", t0 + 10), 0, "autre IP");
  assert.equal(retryAfter("1.2.3.4", t0 + 15 * 60 * 1000 + 10), 0);
});

test("origine : même hôte accepté, absente ou étrangère refusée", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  assert.ok(isSameOrigin(h({ origin: "https://succieu.fr", host: "succieu.fr" })));
  assert.ok(isSameOrigin(h({ origin: "https://succieu.fr", host: "127.0.0.1:3000", "x-forwarded-host": "succieu.fr" })));
  assert.ok(!isSameOrigin(h({ origin: "https://evil.example", host: "succieu.fr" })));
  assert.ok(!isSameOrigin(h({ host: "succieu.fr" })));
  assert.ok(!isSameOrigin(h({ origin: "null", host: "succieu.fr" })));
});
