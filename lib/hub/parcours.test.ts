import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { resetRateLimits } from "../auth/rate-limit";
import { AppError } from "../content/errors";
import { checkModule, checkUser } from "./access";
import { adminCreateUser, adminResetPassword, adminSetActive, adminUpdateUser } from "./admin";
import { hubChangePassword, hubLogin } from "./auth";
import { resolveHubUser } from "./session";
import { createUser, getUserById, getUserByIdentifier, listUsers, type HubUser } from "./users";
import { formatAccountsReport, migrateAccounts, parseAccountSpecs } from "./migrate";

/**
 * Parcours complet, sans navigateur, sur la logique que les routes appellent telle quelle
 * (hubLogin / hubChangePassword / admin* / checkModule). Les routes Next dépendent de
 * `next/headers` et ne sont pas appelables hors serveur : le HTTP réel est couvert par
 * scripts/e2e-hub.mjs.
 */
let dir: string;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "succieu-parcours-"));
  process.env.DATA_DIR = dir;
  process.env.SESSION_SECRET = "p".repeat(40);
});
after(() => fs.rm(dir, { recursive: true, force: true }));
beforeEach(async () => {
  resetRateLimits();
  for (const f of ["users.json", "hub-audit.jsonl"]) await fs.rm(path.join(dir, f), { force: true });
});

const req = (ip = "3.3.3.3") =>
  new Request("https://succieu.fr/api/hub/login", {
    method: "POST",
    headers: { origin: "https://succieu.fr", host: "succieu.fr", "x-forwarded-for": ip },
  });
const code = async (p: Promise<unknown> | (() => unknown)) => {
  try {
    await (typeof p === "function" ? p() : p);
    return "ok";
  } catch (e) {
    if (e instanceof AppError) return e.code;
    throw e;
  }
};

test("parcours : admin crée un compte, provisoire, changement forcé, droits par module, reset", async () => {
  const admin = (await createUser({ displayName: "Admin Test", role: "admin", password: "mot-de-passe-admin" }, { actor: "t" })).user;
  const adminRow = (await getUserById(admin.id)) as HubUser;

  // 1. l'admin crée un compte avec lecture sur Documents, rien d'autre
  const created = await adminCreateUser(adminRow, { displayName: "Camille Test", rights: { documents: "read" } }, "3.3.3.3");
  const temp = created.temporaryPassword;
  assert.equal(created.user.mustChangePassword, true);

  // 2. connexion avec le provisoire : session ouverte mais toute garde refuse tant que non changé
  const first = await hubLogin(req(), "Camille", temp);
  assert.equal(await code(() => checkUser(first.user)), "password_change_required");
  assert.equal(await code(() => checkModule(first.user, "documents", "read")), "password_change_required");

  // 3. changement forcé (ancien faux, trop court, puis valide) ; l'ancienne session tombe
  assert.equal(await code(hubChangePassword(req(), first.user, { oldPassword: "faux", newPassword: "nouveau-mot-de-passe" })), "unauthorized");
  assert.equal(await code(hubChangePassword(req(), first.user, { oldPassword: temp, newPassword: "court" })), "validation_failed");
  const changed = await hubChangePassword(req(), first.user, { oldPassword: temp, newPassword: "nouveau-mot-de-passe" });
  assert.equal(await resolveHubUser(first.token), null);
  const camille = (await resolveHubUser(changed.token)) as HubUser;
  assert.equal(checkUser(camille).id, camille.id);

  // 4. droits : lecture Documents seulement ; refus ailleurs et pour l'administration
  assert.equal(await code(() => checkModule(camille, "documents", "read")), "ok");
  assert.equal(await code(() => checkModule(camille, "documents", "write")), "forbidden");
  assert.equal(await code(() => checkModule(camille, "salle-des-fetes", "read")), "forbidden");
  assert.equal(await code(adminCreateUser(camille, { displayName: "Intrus" })), "forbidden");

  // 5. l'admin passe Camille en écriture sur la salle des fêtes (effet immédiat, sans reconnexion)
  await adminUpdateUser(adminRow, camille.id, { rights: { documents: "read", "salle-des-fetes": "write" } });
  const refreshed = (await resolveHubUser(changed.token)) as HubUser;
  assert.equal(await code(() => checkModule(refreshed, "salle-des-fetes", "write")), "ok");
  assert.equal(await code(() => checkModule(refreshed, "actus-agenda", "read")), "forbidden");

  // 6. reset : session invalidée, ancien mot de passe refusé, nouveau provisoire, changement forcé de nouveau
  const reset = await adminResetPassword(adminRow, camille.id);
  assert.equal(await resolveHubUser(changed.token), null);
  assert.equal(await code(hubLogin(req(), "camille", "nouveau-mot-de-passe")), "unauthorized");
  const again = await hubLogin(req(), "camille", reset.temporaryPassword);
  assert.equal(again.user.mustChangePassword, true);

  // 7. désactivation : plus de connexion
  await adminSetActive(adminRow, camille.id, false);
  assert.equal(await code(hubLogin(req(), "camille", reset.temporaryPassword)), "unauthorized");

  // 8. le journal ne contient ni mot de passe ni empreinte
  const log = await fs.readFile(path.join(dir, "hub-audit.jsonl"), "utf8");
  for (const secret of [temp, reset.temporaryPassword, "nouveau-mot-de-passe", "scrypt$"]) assert.ok(!log.includes(secret));
});

const specs = [
  { displayName: "Alice Test", rights: { "espace-bureau": "write", documents: "read" } },
  { displayName: "Bob Test", identifier: "bob", role: "admin" },
  { displayName: "Alice Autre", identifier: "alice2" },
];

test("migration comptes : validation tout-ou-rien", () => {
  assert.throws(() => parseAccountSpecs([]), AppError);
  assert.throws(() => parseAccountSpecs([{ displayName: "A Test" }, { displayName: "A Autre" }]), /en double/);
  assert.throws(() => parseAccountSpecs([{ displayName: "X", rights: { inconnu: "read" } }]), AppError);
  assert.throws(() => parseAccountSpecs([{ displayName: "X", role: "root" }]), AppError);
  assert.equal(parseAccountSpecs(specs).length, 3);
});

test("migration comptes : simulation n'écrit rien", async () => {
  const r = await migrateAccounts(parseAccountSpecs(specs), { apply: false });
  assert.equal(r.created.length, 3);
  assert.equal((await listUsers()).length, 0);
  assert.match(formatAccountsReport(r, false), /simulation/);
});

test("migration comptes : réel idempotent, fiche 0600, aucun mot de passe dans le rapport ni le journal", async () => {
  const sheet = path.join(dir, "fiche.txt");
  await fs.rm(sheet, { force: true });
  const r = await migrateAccounts(parseAccountSpecs(specs), { apply: true, sheetPath: sheet });
  assert.deepEqual(r.created.map((c) => c.identifier), ["alice", "bob", "alice2"]);
  assert.equal(((await fs.stat(sheet)).mode & 0o777).toString(8), "600");
  const text = await fs.readFile(sheet, "utf8");
  const pws = [...text.matchAll(/Mot de passe provisoire : (\S+)/g)].map((m) => m[1]);
  assert.equal(pws.length, 3);
  assert.ok(!JSON.stringify(r).includes(pws[0]) && !formatAccountsReport(r, true).includes(pws[0]));
  const log = await fs.readFile(path.join(dir, "hub-audit.jsonl"), "utf8");
  assert.ok(pws.every((p) => !log.includes(p)));
  assert.match(log, /user\.create/);
  // connexion avec le provisoire de la fiche, droits conservés
  const alice = await hubLogin(req(), "alice", pws[0]);
  assert.equal(alice.user.mustChangePassword, true);
  assert.equal((await getUserByIdentifier("alice"))!.rights["espace-bureau"], "write");
  assert.equal((await getUserByIdentifier("bob"))!.role, "admin");

  // relance : rien de créé, mots de passe inchangés, aucune nouvelle fiche
  await fs.rm(sheet);
  const again = await migrateAccounts(parseAccountSpecs(specs), { apply: true, sheetPath: sheet });
  assert.equal(again.created.length, 0);
  assert.equal(again.existing.length, 3);
  await assert.rejects(fs.stat(sheet));
  assert.ok(await hubLogin(req("4.4.4.4"), "alice", pws[0]));

  // une fiche existante n'est jamais écrasée
  await fs.rm(path.join(dir, "users.json"));
  await fs.writeFile(sheet, "ancienne fiche", { mode: 0o600 });
  await assert.rejects(migrateAccounts(parseAccountSpecs(specs), { apply: true, sheetPath: sheet }), /EEXIST/);
  assert.equal(await fs.readFile(sheet, "utf8"), "ancienne fiche");
});

test("CLI hub-migrate : simulation par défaut, fiche refusée dans le dépôt, sortie sans mot de passe", async () => {
  const list = path.join(dir, "comptes.json");
  await fs.writeFile(list, JSON.stringify(specs));
  const env = { ...process.env, DATA_DIR: dir };
  const out = execFileSync("node", ["scripts/hub-migrate.mjs", "--users", list], { env }).toString();
  assert.match(out, /SIMULATION/);
  assert.match(out, /à créer : 3/);
  assert.equal((await listUsers()).length, 0);

  assert.throws(() => execFileSync("node", ["scripts/hub-migrate.mjs", "--users", list, "--apply", "--sheet", "fiche-dans-depot.txt"], { env, stdio: "pipe" }), /hors du dépôt|hors dépôt/);

  const sheet = path.join(dir, "fiche-cli.txt");
  await fs.rm(sheet, { force: true });
  const real = execFileSync("node", ["scripts/hub-migrate.mjs", "--users", list, "--apply", "--sheet", sheet], { env }).toString();
  assert.match(real, /créés : 3/);
  const pw = /Mot de passe provisoire : (\S+)/.exec(await fs.readFile(sheet, "utf8"))![1];
  assert.ok(!real.includes(pw));
  const second = execFileSync("node", ["scripts/hub-migrate.mjs", "--users", list, "--apply", "--sheet", sheet], { env }).toString();
  assert.match(second, /déjà présents \(inchangés\) : 3/);
});
