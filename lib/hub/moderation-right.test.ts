import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { AppError } from "../content/errors";
import { adminCreateUser, adminListUsers, adminUpdateUser, adminDriveCompare, adminReadAudit, adminResetPassword, adminSetActive } from "./admin";
import { checkAdmin, checkModerator } from "./access";
import { createUser, getUserById, isModerator, listUsers, type HubUser } from "./users";

let dir: string;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "succieu-hubmod-"));
  process.env.DATA_DIR = dir;
  process.env.SESSION_SECRET = "k".repeat(40);
});
after(() => fs.rm(dir, { recursive: true, force: true }));
beforeEach(async () => {
  await fs.rm(path.join(dir, "users.json"), { force: true });
  await fs.rm(path.join(dir, "hub-audit.jsonl"), { force: true });
});

const code = (fn: () => unknown) =>
  Promise.resolve()
    .then(fn)
    .then(
      () => "ok",
      (e) => (e instanceof AppError ? e.code : String(e)),
    );

async function seed() {
  const admin = (await getUserById((await createUser({ displayName: "Éloïse Test", role: "admin", password: "mot-de-passe-admin" }, { actor: "t" })).user.id)) as HubUser;
  const membre = (await createUser({ displayName: "Alice Test", password: "mot-de-passe-alice" }, { actor: "t" })).user;
  return { admin, membre };
}

test("garde modérateur : admin oui, membre sans droit 403, session absente 401", async () => {
  const { admin, membre } = await seed();
  assert.equal(await code(() => checkModerator(admin)), "ok");
  assert.equal(await code(() => checkModerator((membre as unknown) as HubUser)), "forbidden");
  assert.equal(await code(() => checkModerator(null)), "unauthorized");
  assert.equal(isModerator(membre), false);
});

test("l'admin pose le droit ; le membre devient modérateur ; retrait possible ; journalisé", async () => {
  const { admin, membre } = await seed();
  const on = await adminUpdateUser(admin, membre.id, { moderator: true });
  assert.equal(on.moderator, true);
  const m = (await getUserById(membre.id)) as HubUser;
  assert.equal(isModerator(m), true);
  assert.equal(await code(() => checkModerator(m)), "ok");
  assert.ok((await adminReadAudit(admin)).some((l) => l.action === "user.update" && /moderation=oui/.test(l.detail ?? "")));
  const off = await adminUpdateUser(admin, membre.id, { moderator: false });
  assert.equal(off.moderator, undefined);
  assert.equal(((await getUserById(membre.id)) as HubUser).moderator, undefined);
  // Les modules ne sont pas touchés par le droit.
  assert.equal(off.rights["actus-agenda"], "none");
});

test("valeur invalide refusée ; création avec droit ; comptes existants sans champ = pas de droit", async () => {
  const { admin, membre } = await seed();
  assert.equal(await code(() => adminUpdateUser(admin, membre.id, { moderator: "oui" })), "validation_failed");
  assert.equal(await code(() => adminCreateUser(admin, { displayName: "Bob Test", moderator: 1 })), "validation_failed");
  const r = await adminCreateUser(admin, { displayName: "Zoé Test", moderator: true });
  assert.equal(r.user.moderator, true);
  const list = await adminListUsers();
  assert.equal(list.find((u) => u.identifier === "alice")?.moderator, undefined);
  assert.equal(list.find((u) => u.identifier === "zoe")?.moderator, true);
  assert.equal((await listUsers()).find((u) => u.identifier === "alice")?.moderator, undefined);
});

test("un modérateur n'accède à aucune action d'administration (comptes, groupes, drive, journal)", async () => {
  const { admin, membre } = await seed();
  await adminUpdateUser(admin, membre.id, { moderator: true });
  const mod = (await getUserById(membre.id)) as HubUser;
  assert.equal(await code(() => checkAdmin(mod)), "forbidden");
  assert.equal(await code(() => adminCreateUser(mod, { displayName: "Bob" })), "forbidden");
  assert.equal(await code(() => adminUpdateUser(mod, admin.id, { role: "membre" })), "forbidden");
  assert.equal(await code(() => adminUpdateUser(mod, mod.id, { moderator: true })), "forbidden");
  assert.equal(await code(() => adminSetActive(mod, admin.id, false)), "forbidden");
  assert.equal(await code(() => adminResetPassword(mod, admin.id, {})), "forbidden");
  assert.equal(await code(() => adminReadAudit(mod)), "forbidden");
  assert.equal(await code(() => adminDriveCompare(mod)), "forbidden");
});
