import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { AppError } from "../content/errors";
import { resetRateLimits } from "../auth/rate-limit";
import { verifyPassword } from "../auth/password";
import { allowedModules, checkAdmin, checkModule, checkUser } from "./access";
import { hubChangePassword, hubLogin } from "./auth";
import { createHubToken, resolveHubUser, sessionSeconds, verifyHubToken } from "./session";
import {
  createUser,
  getUserById,
  getUserByIdentifier,
  listUsers,
  resetPassword,
  setActive,
  updateRoleAndRights,
} from "./users";

const KEY = "k".repeat(40);
const BY = { actor: "test" };
let dir: string;

before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "succieu-hub-"));
  process.env.DATA_DIR = dir;
  process.env.SESSION_SECRET = KEY;
});
after(() => fs.rm(dir, { recursive: true, force: true }));
beforeEach(async () => {
  resetRateLimits();
  await fs.rm(path.join(dir, "users.json"), { force: true });
  await fs.rm(path.join(dir, "hub-audit.jsonl"), { force: true });
});

const req = (ip = "1.1.1.1") =>
  new Request("https://succieu.fr/api/hub/login", {
    method: "POST",
    headers: { origin: "https://succieu.fr", host: "succieu.fr", "x-forwarded-for": ip },
  });

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
  return "ok";
}

async function seed() {
  const admin = await createUser({ displayName: "Éloïse Test", role: "admin", password: "mot-de-passe-admin" }, BY);
  const membre = await createUser({ displayName: "Alice Test", rights: { documents: "read" } }, BY);
  return { admin: admin.user, membre: membre.user, temp: membre.temporaryPassword! };
}

test("création : identifiant sans accent, unique, mot de passe provisoire lisible", async () => {
  const { admin, membre, temp } = await seed();
  assert.equal(admin.identifier, "eloise");
  assert.equal(membre.identifier, "alice");
  assert.equal(membre.mustChangePassword, true);
  assert.match(temp, /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
  assert.equal(await code(createUser({ displayName: "Alice Autre" }, BY)), "validation_failed");
  const stored = await getUserByIdentifier("ALICE");
  assert.ok(stored && (await verifyPassword(temp, stored.passwordHash)));
  assert.ok(!JSON.stringify(membre).includes("scrypt"), "vue publique sans empreinte");
  assert.deepEqual(admin.rights, { "actus-agenda": "write", "espace-bureau": "write", "salle-des-fetes": "write", documents: "write" });
  assert.equal(membre.rights.documents, "read");
  assert.equal(membre.rights["actus-agenda"], "none");
  assert.equal(await code(createUser({ displayName: "Bob", rights: { inconnu: "read" } }, BY)), "validation_failed");
  assert.equal(await code(createUser({ displayName: "Bob", rights: { documents: "root" } }, BY)), "validation_failed");
});

test("session : aller-retour, expiration, falsification, durée par défaut 90 jours", async () => {
  const { membre } = await seed();
  const u = (await getUserById(membre.id))!;
  const now = Date.UTC(2026, 10, 24, 10);
  const t = createHubToken(u, now, KEY);
  assert.equal(verifyHubToken(t, now + 1000, KEY)?.uid, u.id);
  assert.equal(verifyHubToken(t, now + 91 * 24 * 3600 * 1000, KEY), null, "expirée");
  assert.ok(verifyHubToken(t, now + 89 * 24 * 3600 * 1000, KEY), "valide à 89 jours");
  assert.equal(verifyHubToken(t, now, "z".repeat(40)), null, "autre secret");
  const forged = Buffer.from(JSON.stringify({ uid: u.id, pv: 1, exp: 9e9 })).toString("base64url");
  assert.equal(verifyHubToken(`${forged}.${t.split(".")[1]}`, now, KEY), null);
  assert.equal(verifyHubToken(undefined, now, KEY), null);
  assert.equal(sessionSeconds(), 2160 * 3600);
  process.env.HUB_SESSION_HOURS = "1";
  assert.equal(sessionSeconds(), 3600);
  delete process.env.HUB_SESSION_HOURS;
});

test("session invalidée : compte désactivé ou mot de passe changé", async () => {
  const { membre, temp } = await seed();
  const { token } = await hubLogin(req(), "alice", temp);
  assert.equal((await resolveHubUser(token))?.id, membre.id);
  await setActive(membre.id, false, BY);
  assert.equal(await resolveHubUser(token), null, "désactivé");
  await setActive(membre.id, true, BY);
  assert.ok(await resolveHubUser(token), "réactivé : même version");
  await resetPassword(membre.id, BY);
  assert.equal(await resolveHubUser(token), null, "mot de passe réinitialisé");
});

test("mustChangePassword : requireUser refuse, session/password autorisés, puis levé", async () => {
  const { temp } = await seed();
  const { user, token } = await hubLogin(req(), "alice", temp);
  assert.equal(user.mustChangePassword, true);
  assert.equal(await code(Promise.resolve().then(() => checkUser(user))), "password_change_required");
  assert.equal(checkUser(user, { allowPasswordChange: true }).id, user.id);
  assert.equal(await code(Promise.resolve().then(() => checkModule(user, "documents", "read"))), "password_change_required");
  assert.equal(await code(Promise.resolve().then(() => checkAdmin(user))), "password_change_required");

  assert.equal(await code(hubChangePassword(req(), user, { oldPassword: "faux", newPassword: "nouveau-mot-de-passe" })), "unauthorized");
  assert.equal(await code(hubChangePassword(req(), user, { oldPassword: temp, newPassword: "court" })), "validation_failed");
  assert.equal(await code(hubChangePassword(req(), user, { oldPassword: temp, newPassword: temp })), "validation_failed");
  const changed = await hubChangePassword(req(), user, { oldPassword: temp, newPassword: "nouveau-mot-de-passe" });
  assert.equal(changed.user.mustChangePassword, false);
  assert.equal(await resolveHubUser(token), null, "ancienne session invalidée");
  const fresh = await resolveHubUser(changed.token);
  assert.ok(fresh);
  assert.equal(checkUser(fresh).id, user.id);
  assert.equal(await code(hubLogin(req(), "alice", temp)), "unauthorized");
  assert.ok(await hubLogin(req(), "alice", "nouveau-mot-de-passe"));
});

test("droits : none/read/write, admin = tout, 401/403", async () => {
  const { admin, membre } = await seed();
  const a = (await getUserById(admin.id))!;
  const m = { ...(await getUserById(membre.id))!, mustChangePassword: false };
  assert.equal(await code(Promise.resolve().then(() => checkUser(null))), "unauthorized");
  assert.equal(checkModule(m, "documents", "read").id, m.id);
  assert.equal(await code(Promise.resolve().then(() => checkModule(m, "documents", "write"))), "forbidden");
  assert.equal(await code(Promise.resolve().then(() => checkModule(m, "actus-agenda", "read"))), "forbidden");
  assert.equal(await code(Promise.resolve().then(() => checkAdmin(m))), "forbidden");
  assert.equal(checkModule(a, "salle-des-fetes", "write").id, a.id);
  assert.equal(checkAdmin(a).id, a.id);
  const up = await updateRoleAndRights(membre.id, { rights: { documents: "write", "actus-agenda": "read" } }, BY);
  assert.equal(up.rights.documents, "write");
  assert.equal(up.rights["actus-agenda"], "read");
  assert.equal(await code(Promise.resolve().then(() => checkModule({ ...(m as typeof a), rights: up.rights }, "documents", "write"))), "ok");
});

test("connexion : origine, limitation 5 échecs par identifiant ET par IP", async () => {
  const { temp } = await seed();
  const bad = new Request("https://succieu.fr/", { method: "POST", headers: { origin: "https://evil.example", host: "succieu.fr" } });
  assert.equal(await code(hubLogin(bad, "alice", temp)), "bad_origin");
  // par identifiant : IP différentes
  for (let i = 0; i < 5; i++) assert.equal(await code(hubLogin(req(`9.9.9.${i}`), "alice", "faux")), "unauthorized");
  assert.equal(await code(hubLogin(req("8.8.8.8"), "alice", temp)), "rate_limited", "identifiant bloqué même avec le bon mot de passe");
  // par IP : identifiants différents
  for (let i = 0; i < 5; i++) assert.equal(await code(hubLogin(req("7.7.7.7"), `inconnu${i}`, "faux")), "unauthorized");
  assert.equal(await code(hubLogin(req("7.7.7.7"), "eloise", "mot-de-passe-admin")), "rate_limited", "IP bloquée");
  assert.ok(await hubLogin(req("6.6.6.6"), "eloise", "mot-de-passe-admin"), "autre IP/identifiant non touchés");
});

test("connexion : compte désactivé et identifiant inconnu refusés", async () => {
  const { membre, temp } = await seed();
  await setActive(membre.id, false, BY);
  assert.equal(await code(hubLogin(req(), "alice", temp)), "unauthorized");
  assert.equal(await code(hubLogin(req(), "personne", "x".repeat(12))), "unauthorized");
});

test("dernier admin : ni désactivation, ni rétrogradation", async () => {
  const { admin, membre } = await seed();
  assert.equal(await code(setActive(admin.id, false, BY)), "invalid_transition");
  assert.equal(await code(updateRoleAndRights(admin.id, { role: "membre" }, BY)), "invalid_transition");
  await updateRoleAndRights(membre.id, { role: "admin" }, BY);
  await setActive(admin.id, false, BY); // un autre admin actif existe
  assert.equal(await code(setActive(membre.id, false, BY)), "invalid_transition");
  assert.equal(await code(updateRoleAndRights(membre.id, { role: "membre" }, BY)), "invalid_transition");
  await setActive(admin.id, true, BY);
  assert.equal(await code(setActive(membre.id, false, BY)), "ok");
});

test("réinitialisation : provisoire lisible, mustChangePassword", async () => {
  const { membre } = await seed();
  const r = await resetPassword(membre.id, BY);
  assert.match(r.temporaryPassword, /^[a-z2-9]{4}(-[a-z2-9]{4}){2}$/);
  assert.equal(r.user.mustChangePassword, true);
  assert.equal(await code(resetPassword("inconnu", BY)), "not_found");
});

test("journal d'audit : sans mot de passe ni empreinte", async () => {
  const { temp } = await seed();
  await hubLogin(req(), "alice", temp);
  await code(hubLogin(req(), "alice", "faux-mot-de-passe"));
  const raw = await fs.readFile(path.join(dir, "hub-audit.jsonl"), "utf8");
  const lines = raw.trim().split("\n").map((l) => JSON.parse(l));
  assert.ok(lines.some((l) => l.action === "user.create"));
  assert.ok(lines.some((l) => l.action === "login.ok" && l.ip === "1.1.1.1"));
  assert.ok(lines.some((l) => l.action === "login.failed"));
  assert.ok(!raw.includes(temp) && !raw.includes("faux-mot-de-passe") && !raw.includes("scrypt$"));
  assert.ok(lines.every((l) => l.date && l.actor && l.action));
});

test("CLI hub-create-admin : crée un admin avec mot de passe sur stdin", async () => {
  const out = execFileSync("node", ["scripts/hub-create-admin.mjs", "zoe", "Zoé Test"], {
    input: "un-mot-de-passe-long",
    env: { ...process.env, DATA_DIR: dir },
  }).toString();
  assert.match(out, /zoe/);
  const u = (await listUsers()).find((x) => x.identifier === "zoe");
  assert.equal(u?.role, "admin");
  assert.equal(u?.mustChangePassword, false);
  assert.ok(await verifyPassword("un-mot-de-passe-long", u!.passwordHash));
});

test("allowedModules : seuls les modules en lecture ou écriture, admin = tout en écriture", () => {
  const member = { role: "membre" as const, rights: { "actus-agenda": "write", documents: "read", "salle-des-fetes": "none" } as never };
  const list = allowedModules(member);
  assert.deepEqual(list.map((m) => [m.id, m.level]), [["actus-agenda", "write"], ["documents", "read"]]);
  const all = allowedModules({ role: "admin", rights: {} as never });
  assert.equal(all.length, 4);
  assert.ok(all.every((m) => m.level === "write"));
  assert.equal(allowedModules({ role: "membre", rights: {} as never }).length, 0);
});
