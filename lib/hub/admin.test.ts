import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { verifyPassword } from "../auth/password";
import { AppError } from "../content/errors";
import {
  adminCreateUser,
  adminListUsers,
  adminReadAudit,
  adminResetPassword,
  adminSetActive,
  adminUpdateUser,
} from "./admin";
import { audit } from "./audit";
import { createUser, getUserById, type HubUser } from "./users";

let dir: string;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "succieu-hubadmin-"));
  process.env.DATA_DIR = dir;
  process.env.SESSION_SECRET = "k".repeat(40);
});
after(() => fs.rm(dir, { recursive: true, force: true }));
beforeEach(async () => {
  await fs.rm(path.join(dir, "users.json"), { force: true });
  await fs.rm(path.join(dir, "hub-audit.jsonl"), { force: true });
});

const code = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e) => (e instanceof AppError ? e.code : String(e)),
  );

async function seed() {
  const admin = (await getUserById((await createUser({ displayName: "Éloïse Test", role: "admin", password: "mot-de-passe-admin" }, { actor: "t" })).user.id)) as HubUser;
  const membre = (await createUser({ displayName: "Alice Test", password: "mot-de-passe-alice" }, { actor: "t" })).user;
  return { admin, membre };
}

test("droits : un membre ou une absence de session reçoit 401/403 sur toutes les actions", async () => {
  const { admin, membre } = await seed();
  const m = (await getUserById(membre.id)) as HubUser;
  for (const u of [m, null]) {
    const want = u ? "forbidden" : "unauthorized";
    assert.equal(await code(adminCreateUser(u, { displayName: "Bob" })), want);
    assert.equal(await code(adminUpdateUser(u, admin.id, { role: "membre" })), want);
    assert.equal(await code(adminSetActive(u, membre.id, false)), want);
    assert.equal(await code(adminResetPassword(u, membre.id)), want);
    assert.equal(await code(adminReadAudit(u)), want);
  }
});

test("création : identifiant proposé, droits, mot de passe provisoire renvoyé, jamais journalisé", async () => {
  const { admin } = await seed();
  const r = await adminCreateUser(admin, { displayName: "Zoé Test", rights: { documents: "write" } }, "2.2.2.2");
  assert.equal(r.user.identifier, "zoe");
  assert.equal(r.user.mustChangePassword, true);
  assert.equal(r.user.rights.documents, "write");
  assert.match(r.temporaryPassword, /^[a-z2-9]{4}(-[a-z2-9]{4}){2}$/);
  assert.ok(!("passwordHash" in r.user));
  const stored = (await getUserById(r.user.id)) as HubUser;
  assert.ok(await verifyPassword(r.temporaryPassword, stored.passwordHash));
  const log = await fs.readFile(path.join(dir, "hub-audit.jsonl"), "utf8");
  assert.ok(!log.includes(r.temporaryPassword) && !log.includes("scrypt"));
  assert.match(log, /user\.create/);
  const list = JSON.stringify(await adminListUsers());
  assert.ok(!list.includes(r.temporaryPassword) && !list.includes("scrypt"), "la liste ne renvoie jamais le mot de passe");
});

test("réinitialisation : nouveau provisoire une seule fois, session invalidée, jamais journalisé", async () => {
  const { admin, membre } = await seed();
  const before = (await getUserById(membre.id)) as HubUser;
  const r = await adminResetPassword(admin, membre.id);
  const after = (await getUserById(membre.id)) as HubUser;
  assert.equal(after.passwordVersion, before.passwordVersion + 1);
  assert.ok(await verifyPassword(r.temporaryPassword, after.passwordHash));
  assert.ok(!JSON.stringify(r.user).includes(r.temporaryPassword));
  const log = await fs.readFile(path.join(dir, "hub-audit.jsonl"), "utf8");
  assert.ok(!log.includes(r.temporaryPassword));
  assert.match(log, /user\.reset-password/);
  assert.equal(await code(adminResetPassword(admin, admin.id)), "invalid_transition");
  assert.equal(await code(adminResetPassword(admin, "inconnu")), "not_found");
});

test("garde-fous : pas d'auto-désactivation ni d'auto-rétrogradation, dernier admin protégé", async () => {
  const { admin, membre } = await seed();
  assert.equal(await code(adminSetActive(admin, admin.id, false)), "invalid_transition");
  assert.equal(await code(adminUpdateUser(admin, admin.id, { role: "membre" })), "invalid_transition");
  assert.equal(await code(adminSetActive(admin, membre.id, "non")), "validation_failed");
  // Un second admin ne peut pas retirer le dernier admin actif, mais peut désactiver le premier.
  const second = (await createUser({ displayName: "Marc Test", role: "admin", password: "mot-de-passe-marc" }, { actor: "t" })).user;
  const secondFull = (await getUserById(second.id)) as HubUser;
  assert.equal((await adminSetActive(secondFull, admin.id, false)).active, false);
  assert.equal(await code(adminUpdateUser(admin, second.id, { role: "membre" })), "invalid_transition");
  assert.equal((await getUserById(second.id))?.role, "admin");
});

test("droits par module : enregistrement journalisé, valeurs invalides refusées", async () => {
  const { admin, membre } = await seed();
  const u = await adminUpdateUser(admin, membre.id, { rights: { documents: "read", "salle-des-fetes": "write" } });
  assert.equal(u.rights.documents, "read");
  assert.equal(u.rights["salle-des-fetes"], "write");
  assert.equal(await code(adminUpdateUser(admin, membre.id, { rights: { documents: "root" } })), "validation_failed");
  assert.equal(await code(adminUpdateUser(admin, membre.id, "x")), "validation_failed");
  const entries = await adminReadAudit(admin, "alice");
  assert.ok(entries.some((e) => e.action === "user.update" && e.detail?.includes("salle-des-fetes")));
  const off = await adminSetActive(admin, membre.id, false);
  assert.equal(off.active, false);
  assert.equal((await adminSetActive(admin, membre.id, true)).active, true);
});

test("journal : dernière connexion, filtre par personne, lignes illisibles ignorées", async () => {
  const { admin, membre } = await seed();
  await audit({ actor: "alice", action: "login.failed", ip: "1.1.1.1" });
  await audit({ actor: "alice", action: "login.ok" });
  await fs.appendFile(path.join(dir, "hub-audit.jsonl"), "pas du json\n");
  const list = await adminListUsers();
  assert.ok(list.find((u) => u.id === membre.id)?.lastLogin);
  assert.equal(list.find((u) => u.id === admin.id)?.lastLogin, null);
  const entries = await adminReadAudit(admin, "Alice");
  assert.ok(entries.length >= 2 && entries.every((e) => e.actor === "alice" || e.detail?.startsWith("alice")));
  assert.equal(entries[0].action !== undefined, true);
  assert.equal((await adminReadAudit(admin, "nobody")).length, 0);
  await audit({ actor: "root", action: "user.disable", detail: "alicia" });
  await audit({ actor: "root", action: "user.create", detail: "alice (membre)" });
  const exact = await adminReadAudit(admin, "alice");
  assert.ok(!exact.some((e) => e.detail === "alicia"));
  assert.ok(exact.some((e) => e.detail === "alice (membre)"));
  assert.equal((await adminReadAudit(admin, undefined, 1)).length, 1);
});
