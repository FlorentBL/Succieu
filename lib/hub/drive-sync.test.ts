import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { verifyPassword } from "../auth/password";
import { AppError } from "../content/errors";
import {
  adminCreateUser,
  adminDriveAttach,
  adminDriveCompare,
  adminResetPassword,
  adminSetActive,
  adminUpdateUser,
} from "./admin";
import { compareAccounts, driveConfig, driveSyncEnabled, ensureDriveAccount, listDriveAccounts, resetDriveToken, setDrivePassword, setDriveEnabled } from "./drive-sync";
import { migrateAccounts, parseAccountSpecs } from "./migrate";
import { createUser, getUserById, getUserByIdentifier, type HubUser } from "./users";

/**
 * Faux serveur local : Konnect (OIDC code + PKCE, logon avec XSRF/Origin/Referer) et Libre Graph
 * simulés. AUCUN appel réel au drive. Les mots de passe des comptes simulés restent en mémoire.
 */
const ADMIN = { user: "admin-drive", pass: "mdp-admin-fictif" };
type FakeUser = { id: string; login: string; displayName: string; mail?: string; password: string; enabled: boolean; roles: string[] };

let server: http.Server;
let base = "";
let drive: Map<string, FakeUser>;
let calls: { method: string; path: string }[];
let tokenIssued = 0;
let rejectPasswords = false;
let rejectEnable = false;
const challenges = new Map<string, string>();
let nextId = 1;

const readBody = (req: http.IncomingMessage) =>
  new Promise<string>((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d));
  });

function handler(req: http.IncomingMessage, res: http.ServerResponse) {
  void (async () => {
    const url = new URL(req.url ?? "/", base);
    const raw = await readBody(req);
    const send = (status: number, body?: unknown, headers: Record<string, string | string[]> = {}) => {
      res.writeHead(status, { "content-type": "application/json", ...headers });
      res.end(body === undefined ? "" : JSON.stringify(body));
    };
    calls.push({ method: req.method ?? "", path: url.pathname });
    const cookies = req.headers.cookie ?? "";

    if (url.pathname === "/.well-known/openid-configuration") {
      return send(200, { authorization_endpoint: `${base}/konnect/v1/authorize`, token_endpoint: `${base}/konnect/v1/token` });
    }
    if (url.pathname === "/konnect/v1/authorize") {
      const redirect = url.searchParams.get("redirect_uri")!;
      if (cookies.includes("logged=1")) {
        const code = `code${challenges.size + 1}`;
        challenges.set(code, url.searchParams.get("code_challenge")!);
        return send(302, undefined, { location: `${redirect}?code=${code}&state=${url.searchParams.get("state")}` });
      }
      return send(302, undefined, { location: `${base}/signin`, "set-cookie": ["konnect=1; Path=/; HttpOnly"] });
    }
    if (url.pathname === "/signin/v1/identifier/_/logon") {
      if (req.headers["kopano-konnect-xsrf"] !== "1" || !req.headers.origin || !req.headers.referer) return send(400, { error: "missing origin or referer header" });
      const body = JSON.parse(raw) as { params: string[]; hello: { client_id: string; flow: string } };
      if (body.hello.client_id !== "web" || body.hello.flow !== "oidc") return send(400, {});
      if (body.params[0] !== ADMIN.user || body.params[1] !== ADMIN.pass) return send(200, { success: false });
      return send(200, { success: true }, { "set-cookie": ["logged=1; Path=/"] });
    }
    if (url.pathname === "/konnect/v1/token") {
      const f = new URLSearchParams(raw);
      const challenge = challenges.get(f.get("code") ?? "");
      const ok = challenge && createHash("sha256").update(f.get("code_verifier") ?? "").digest("base64url") === challenge;
      if (!ok) return send(400, { error: "invalid_grant" });
      tokenIssued++;
      return send(200, { access_token: `jeton-${tokenIssued}`, expires_in: 300 });
    }

    if (!url.pathname.startsWith("/graph/v1.0/")) return send(404, {});
    if (!(req.headers.authorization ?? "").startsWith("Bearer jeton-")) return send(401, { error: { message: "unauthorized" } });
    const rest = url.pathname.slice("/graph/v1.0/".length).split("/");
    const json = raw ? JSON.parse(raw) : {};
    const out = (u: FakeUser) => ({ id: u.id, onPremisesSamAccountName: u.login, displayName: u.displayName, accountEnabled: u.enabled });
    if (rest[0] === "users" && rest.length === 1) {
      if (req.method === "GET") return send(200, { value: [...drive.values()].map(out) });
      if (req.method === "POST") {
        const login = json.onPremisesSamAccountName as string;
        if (drive.has(login)) return send(409, { error: { message: "exists" } });
        const u: FakeUser = { id: `uid-${nextId++}`, login, displayName: json.displayName, mail: json.mail, password: json.passwordProfile.password, enabled: true, roles: [] };
        drive.set(login, u);
        return send(201, out(u));
      }
    }
    if (rest[0] === "users" && rest.length === 2) {
      const key = decodeURIComponent(rest[1]);
      const u = drive.get(key);
      if (!u) return send(404, { error: { message: "not found" } });
      if (req.method === "GET") return send(200, out(u));
      if (req.method === "PATCH") {
        if (json.passwordProfile) {
          if (rejectPasswords) return send(400, { error: { message: "password policy" } });
          u.password = json.passwordProfile.password;
        }
        if (typeof json.accountEnabled === "boolean") {
          if (rejectEnable) return send(400, { error: { message: "accountEnabled not supported" } });
          u.enabled = json.accountEnabled;
        }
        return send(204);
      }
    }
    if (rest[0] === "users" && rest[2] === "appRoleAssignments" && req.method === "POST") {
      const u = [...drive.values()].find((x) => x.id === rest[1]);
      if (!u) return send(404, {});
      u.roles.push(json.appRoleId);
      return send(201, {});
    }
    return send(405, {});
  })();
}

let dir: string;
const ENV = ["DRIVE_URL", "DRIVE_ADMIN_USER", "DRIVE_ADMIN_PASSWORD", "DRIVE_MAIL_DOMAIN"] as const;
const driveOn = () => {
  process.env.DRIVE_URL = base;
  process.env.DRIVE_ADMIN_USER = ADMIN.user;
  process.env.DRIVE_ADMIN_PASSWORD = ADMIN.pass;
};

before(async () => {
  server = http.createServer(handler);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "succieu-drivesync-"));
  process.env.DATA_DIR = dir;
  process.env.SESSION_SECRET = "d".repeat(40);
});
after(async () => {
  server.close();
  server.closeAllConnections();
  for (const k of ENV) delete process.env[k];
  await fs.rm(dir, { recursive: true, force: true });
});
beforeEach(async () => {
  drive = new Map();
  calls = [];
  tokenIssued = 0;
  rejectPasswords = false;
  rejectEnable = false;
  challenges.clear();
  resetDriveToken();
  for (const k of ENV) delete process.env[k];
  for (const f of ["users.json", "hub-audit.jsonl"]) await fs.rm(path.join(dir, f), { force: true });
});

const code = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e) => (e instanceof AppError ? e.code : String(e)),
  );
const admin = async (): Promise<HubUser> => {
  const { user } = await createUser({ displayName: "Admin Test", role: "admin", password: "mot-de-passe-admin" }, { actor: "t" });
  return (await getUserById(user.id)) as HubUser;
};
const seedDrive = (login: string, password = "ancien-mdp-drive", enabled = true) =>
  drive.set(login, { id: `uid-${nextId++}`, login, displayName: login, password, enabled, roles: [] });

test("sans variables : synchro désactivée, le hub fonctionne seul et aucun appel n'est fait", async () => {
  assert.equal(driveSyncEnabled(), false);
  assert.equal(driveConfig({ DRIVE_URL: "https://drive.exemple.test" }), null);
  const a = await admin();
  const r = await adminCreateUser(a, { displayName: "Alice Test" });
  assert.equal(r.drive.status, "disabled");
  assert.match(r.password, /^[a-z2-9]{4}(-[a-z2-9]{4}){2}$/);
  assert.deepEqual(await adminDriveCompare(a), { enabled: false, rows: [] });
  assert.equal((await adminResetPassword(a, r.user.id, {})).drive.status, "disabled");
  assert.equal((await adminSetActive(a, r.user.id, false)).drive.status, "disabled");
  assert.equal(calls.length, 0);
});

test("configuration : https exigé hors boucle locale, identifiants intégrés refusés", () => {
  assert.equal(driveConfig({ DRIVE_URL: "http://drive.exemple.test", DRIVE_ADMIN_USER: "a", DRIVE_ADMIN_PASSWORD: "b" }), null);
  assert.equal(driveConfig({ DRIVE_URL: "https://u:p@drive.exemple.test", DRIVE_ADMIN_USER: "a", DRIVE_ADMIN_PASSWORD: "b" }), null);
  assert.equal(driveConfig({ DRIVE_URL: "https://drive.exemple.test/chemin", DRIVE_ADMIN_USER: "a", DRIVE_ADMIN_PASSWORD: "b" })?.url, "https://drive.exemple.test");
});

test("jeton : flux OIDC code + PKCE, mis en cache ; mot de passe admin refusé ⇒ erreur claire", async () => {
  driveOn();
  seedDrive("alice");
  assert.equal((await listDriveAccounts()).length, 1);
  await listDriveAccounts();
  assert.equal(tokenIssued, 1, "jeton réutilisé tant qu'il n'a pas expiré");
  resetDriveToken();
  await listDriveAccounts();
  assert.equal(tokenIssued, 2);
  resetDriveToken();
  calls = [];
  process.env.DRIVE_ADMIN_PASSWORD = "mauvais";
  await assert.rejects(listDriveAccounts(), (e: AppError) => e.code === "drive_sync_failed" && /refusée/.test(e.message));
  assert.ok(!calls.some((c) => c.path.startsWith("/graph")), "aucun appel Graph sans jeton");
});

test("création : compte drive créé avec le rôle User, même mot de passe que le hub", async () => {
  driveOn();
  const a = await admin();
  const r = await adminCreateUser(a, { displayName: "Alice Test", passwordMode: "custom", password: "mot-de-passe-commun" });
  assert.equal(r.drive.status, "created");
  const d = drive.get("alice")!;
  assert.equal(d.password, "mot-de-passe-commun");
  assert.deepEqual(d.roles, ["d7beeea8-8ff4-406b-8fb6-ab2dd81e6b11"]);
  assert.match(d.mail!, /^alice@/);
  const hub = (await getUserByIdentifier("alice"))!;
  assert.ok(await verifyPassword("mot-de-passe-commun", hub.passwordHash));
  assert.ok(hub.driveSync?.at && !hub.driveSync.error);
  const log = await fs.readFile(path.join(dir, "hub-audit.jsonl"), "utf8");
  assert.ok(!log.includes("mot-de-passe-commun"));
});

test("création : compte drive existant rattaché (mot de passe aligné), identifiant drive distinct", async () => {
  driveOn();
  seedDrive("secretariat");
  const a = await admin();
  const r = await adminCreateUser(a, { displayName: "Marie Test", identifier: "marie", driveLogin: "Secretariat", passwordMode: "generate" });
  assert.equal(r.drive.status, "attached");
  assert.equal(r.user.driveLogin, "secretariat");
  assert.equal(drive.get("secretariat")!.password, r.password);
  assert.equal(drive.size, 1, "aucun doublon créé");
  assert.deepEqual(drive.get("secretariat")!.roles, [], "compte existant : rôle et espaces non touchés");
});

test("création : drive qui refuse ⇒ rien n'est créé dans le hub ; identifiant déjà pris ⇒ drive intact", async () => {
  driveOn();
  seedDrive("alice");
  rejectPasswords = true;
  const a = await admin();
  assert.equal(await code(adminCreateUser(a, { displayName: "Alice Test" })), "drive_sync_failed");
  assert.equal(await getUserByIdentifier("alice"), null);
  rejectPasswords = false;
  await adminCreateUser(a, { displayName: "Alice Test" });
  const before = drive.get("alice")!.password;
  assert.equal(await code(adminCreateUser(a, { displayName: "Alice Autre" })), "validation_failed");
  assert.equal(drive.get("alice")!.password, before, "pas d'écriture drive pour un identifiant déjà pris");
});

test("mot de passe refusé par le drive ⇒ hub inchangé, erreur consignée", async () => {
  driveOn();
  const a = await admin();
  const { user, password } = await adminCreateUser(a, { displayName: "Alice Test" });
  const before = (await getUserById(user.id)) as HubUser;
  rejectPasswords = true;
  await assert.rejects(adminResetPassword(a, user.id, { passwordMode: "custom", password: "nouveau-mot-de-passe" }), (e: AppError) => e.code === "drive_sync_failed" && /refusé/.test(e.message));
  const after = (await getUserById(user.id)) as HubUser;
  assert.equal(after.passwordHash, before.passwordHash);
  assert.equal(after.passwordVersion, before.passwordVersion);
  assert.ok(await verifyPassword(password, after.passwordHash));
  assert.equal(drive.get("alice")!.password, password);
  assert.match(after.driveSync?.error ?? "", /refusé/);
  rejectPasswords = false;
  const ok = await adminResetPassword(a, user.id, { passwordMode: "custom", password: "nouveau-mot-de-passe" });
  assert.equal(drive.get("alice")!.password, "nouveau-mot-de-passe");
  assert.ok(await verifyPassword("nouveau-mot-de-passe", ((await getUserById(user.id)) as HubUser).passwordHash));
  assert.equal(ok.drive.status, "attached");
  assert.equal(((await getUserById(user.id)) as HubUser).driveSync?.error, undefined);
});

test("réinitialisation : un compte hub sans compte drive en reçoit un (sans toucher à rien d'autre)", async () => {
  const a = await admin();
  const { user } = await adminCreateUser(a, { displayName: "Alice Test" }); // synchro encore désactivée
  driveOn();
  const r = await adminResetPassword(a, user.id, {});
  assert.equal(r.drive.status, "created");
  assert.equal(drive.get("alice")!.password, r.password);
});

test("désactivation / réactivation : accountEnabled répercuté ; échec du drive ⇒ hub quand même désactivé", async () => {
  driveOn();
  const a = await admin();
  const { user } = await adminCreateUser(a, { displayName: "Alice Test" });
  const off = await adminSetActive(a, user.id, false);
  assert.equal(off.drive.status, "updated");
  assert.equal(drive.get("alice")!.enabled, false);
  assert.equal(off.user.active, false);
  assert.equal((await adminSetActive(a, user.id, true)).user.active, true);
  assert.equal(drive.get("alice")!.enabled, true);

  rejectEnable = true;
  const failed = await adminSetActive(a, user.id, false);
  assert.equal(failed.user.active, false, "la sécurité du hub ne dépend pas du drive");
  assert.equal(failed.drive.status, "error");
  assert.match(failed.drive.error ?? "", /désactivation/);
  assert.match(((await getUserById(user.id)) as HubUser).driveSync?.error ?? "", /désactivation/);
  assert.equal(drive.get("alice")!.enabled, true);
});

test("jamais de suppression, jamais d'espace ni de permission : seules GET/POST/PATCH sur /users", async () => {
  driveOn();
  const a = await admin();
  const { user } = await adminCreateUser(a, { displayName: "Alice Test" });
  await adminResetPassword(a, user.id, {});
  await adminSetActive(a, user.id, false);
  await adminDriveCompare(a);
  assert.ok(calls.length > 5);
  assert.ok(!calls.some((c) => c.method === "DELETE" || c.method === "PUT"));
  assert.ok(calls.filter((c) => c.path.startsWith("/graph")).every((c) => /^\/graph\/v1\.0\/users(\/|$)/.test(c.path)), "uniquement /users");
  const src = await fs.readFile(path.join(import.meta.dirname, "drive-sync.ts"), "utf8");
  assert.ok(!/["']DELETE["']/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")), "aucune méthode DELETE dans le module");
});

test("comparaison hub ↔ drive, rattachement et identifiant drive modifiable", async () => {
  driveOn();
  const a = await admin();
  seedDrive("admin-hub-absent"); // drive sans hub
  seedDrive("secretariat");
  seedDrive("bob", "x", false); // désactivé côté drive seulement
  const bob = (await adminCreateUser(a, { displayName: "Bob Test", driveLogin: "bob" })).user;
  await adminSetActive(a, bob.id, true);
  drive.get("bob")!.enabled = false;
  const marie = await createUser({ displayName: "Marie Test", password: "mot-de-passe-marie" }, { actor: "t" });
  const carl = await createUser({ displayName: "Carl Test", password: "mot-de-passe-carl" }, { actor: "t" }); // hub sans drive
  const { rows, enabled } = await adminDriveCompare(a);
  assert.ok(enabled);
  const by = (login: string) => rows.find((r) => r.driveLogin === login)!;
  assert.equal(by("admin-hub-absent").status, "drive-sans-hub");
  assert.equal(by("bob").status, "desactive-drive-seulement");
  assert.equal(by("carl").status, "hub-sans-drive");
  assert.equal(by("marie").status, "hub-sans-drive");
  assert.equal(by("secretariat").status, "drive-sans-hub");
  assert.equal(by("admin").status, "hub-sans-drive");

  // rattacher Marie au compte « secretariat »
  const callsBefore = calls.filter((c) => c.method !== "GET").length;
  const att = await adminDriveAttach(a, { userId: marie.user.id, driveLogin: "secretariat" });
  assert.equal(att.driveLogin, "secretariat");
  assert.equal(calls.filter((c) => c.method !== "GET").length, callsBefore, "rattacher n'écrit rien sur le drive");
  assert.equal(await code(adminDriveAttach(a, { userId: carl.user.id, driveLogin: "secretariat" })), "conflict");
  assert.equal(await code(adminDriveAttach(a, { userId: carl.user.id, driveLogin: "inconnu" })), "not_found");
  assert.equal((await adminDriveCompare(a)).rows.find((r) => r.driveLogin === "secretariat")!.status, "ok");

  // l'admin peut changer l'identifiant drive d'un compte
  const upd = await adminUpdateUser(a, carl.user.id, { driveLogin: "Carl.Drive" });
  assert.equal(upd.driveLogin, "carl.drive");
  assert.equal(await code(adminUpdateUser(a, carl.user.id, { driveLogin: "a b/c" })), "validation_failed");
  assert.equal((await adminUpdateUser(a, carl.user.id, { driveLogin: "" })).driveLogin, "carl");

  // comparaison pure : désactivé côté hub seulement
  const rowsPure = compareAccounts(
    [{ ...((await getUserById(bob.id)) as HubUser), active: false }],
    [{ id: "1", login: "bob", displayName: "Bob", enabled: true }],
  );
  assert.equal(rowsPure[0].status, "desactive-hub-seulement");
});

test("migration : comptes drive créés ou rattachés avec le même mot de passe que le hub ; refus drive ⇒ personne non créée", async () => {
  driveOn();
  seedDrive("bob");
  const specs = parseAccountSpecs([
    { displayName: "Alice Test" },
    { displayName: "Bob Test", identifier: "bob" },
    { displayName: "Marie Test", identifier: "marie", driveLogin: "secretariat" },
  ]);
  seedDrive("secretariat");
  const dry = await migrateAccounts(specs, { apply: false });
  assert.deepEqual(dry.drive, { created: ["alice"], attached: ["bob", "secretariat"] });
  assert.equal(await getUserByIdentifier("alice"), null);
  assert.equal(drive.has("alice"), false, "simulation : rien d'écrit sur le drive");

  const sheet = path.join(dir, "fiche.txt");
  await fs.rm(sheet, { force: true });
  const r = await migrateAccounts(specs, { apply: true, sheetPath: sheet, driveUrl: base });
  assert.equal(r.failed.length, 0);
  const text = await fs.readFile(sheet, "utf8");
  const pws = [...text.matchAll(/Mot de passe : (\S+)/g)].map((m) => m[1]);
  assert.equal(pws.length, 3);
  assert.match(text, /drive : secretariat/);
  for (const [i, [hubId, driveId]] of [["alice", "alice"], ["bob", "bob"], ["marie", "secretariat"]].entries()) {
    assert.equal(drive.get(driveId)!.password, pws[i]);
    assert.ok(await verifyPassword(pws[i], (await getUserByIdentifier(hubId))!.passwordHash));
  }
  assert.ok(!JSON.stringify(r).includes(pws[0]));

  // bascule : --reset-all repose un mot de passe commun aux comptes existants ; un refus du drive laisse le hub intact
  await fs.rm(sheet);
  rejectPasswords = true;
  const hubBefore = (await getUserByIdentifier("alice"))!.passwordHash;
  const bad = await migrateAccounts(specs, { apply: true, sheetPath: sheet, driveUrl: base, resetExisting: true });
  assert.equal(bad.failed.length, 3);
  assert.equal((await getUserByIdentifier("alice"))!.passwordHash, hubBefore);
  await fs.rm(sheet);
  rejectPasswords = false;
  const again = await migrateAccounts(specs, { apply: true, sheetPath: sheet, driveUrl: base, resetExisting: true });
  assert.deepEqual(again.reset.sort(), ["alice", "bob", "marie"]);
  const pws2 = [...(await fs.readFile(sheet, "utf8")).matchAll(/Mot de passe : (\S+)/g)].map((m) => m[1]);
  assert.equal(drive.get("secretariat")!.password, pws2[2]);
  assert.ok(await verifyPassword(pws2[2], (await getUserByIdentifier("marie"))!.passwordHash));
});

test("garde-fou : le compte administrateur du drive n'est jamais rattachable ni modifié", async () => {
  driveOn();
  seedDrive("admin-drive");
  seedDrive("marie");
  const a = await admin();
  const { user } = await adminCreateUser(a, { displayName: "Marie Test", identifier: "marie" });
  const before = drive.get("admin-drive")!.password;
  const writes = () => calls.filter((c) => c.method !== "GET").length;
  const w0 = writes();
  for (const l of ["admin", "ADMIN", "Admin-Drive", " admin-drive "]) {
    assert.equal(await code(adminUpdateUser(a, user.id, { driveLogin: l })), "validation_failed", l);
    assert.equal(await code(adminCreateUser(a, { displayName: "Autre Test", driveLogin: l })), "validation_failed", l);
    assert.equal(await code(adminDriveAttach(a, { userId: user.id, driveLogin: l })), "validation_failed", l);
  }
  const cfg = driveConfig()!;
  for (const fn of [
    () => ensureDriveAccount("Admin-Drive", "X", "mdp-long-fictif-1", cfg),
    () => setDrivePassword("admin", "mdp-long-fictif-1", cfg),
    () => setDriveEnabled("ADMIN", false, cfg),
  ]) await assert.rejects(fn(), (e: AppError) => e.code === "validation_failed");
  assert.equal(writes(), w0, "aucune écriture sur le drive");
  assert.equal(drive.get("admin-drive")!.password, before);
  assert.equal(drive.get("admin-drive")!.enabled, true);
  const rows = compareAccounts([], [{ id: "1", login: "admin-drive", displayName: "Admin", enabled: true }]);
  assert.equal(rows[0].technical, true);
  assert.throws(() => parseAccountSpecs([{ displayName: "Faux Admin", driveLogin: "Admin" }]), (e: AppError) => e.code === "validation_failed" && /administrateur technique/.test(e.message));
});
