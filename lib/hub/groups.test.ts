import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { AppError } from "../content/errors";
import { readAudit } from "./admin";
import { adminApplyGroupTemplate, adminReadGroups, adminSetGroupTemplate } from "./groups";
import { effectiveTemplates, isCustomized, mostFrequentRights, planApply } from "./group-rights";
import { noRights, type Rights } from "./modules";
import { createUser, getUserById, listUsers, type HubUser } from "./users";

let dir: string;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "succieu-hubgroups-"));
  process.env.DATA_DIR = dir;
  process.env.SESSION_SECRET = "k".repeat(40);
});
after(() => fs.rm(dir, { recursive: true, force: true }));
beforeEach(async () => {
  for (const f of ["users.json", "hub-groups.json", "hub-audit.jsonl"]) await fs.rm(path.join(dir, f), { force: true });
});

const code = (p: Promise<unknown>) => p.then(() => "ok", (e) => (e instanceof AppError ? e.code : String(e)));
const R = (o: Partial<Rights>): Rights => ({ ...noRights(), ...o });
const pw = "mot-de-passe-test";

async function seed() {
  const actor = { actor: "t" };
  const admin = (await getUserById((await createUser({ displayName: "Admin Test", role: "admin", category: "bureau", password: pw }, actor)).user.id)) as HubUser;
  const mk = (displayName: string, category: string | undefined, rights: Partial<Rights>) =>
    createUser({ displayName, category, rights, password: pw }, actor);
  await mk("Ana Test", "bureau", { "espace-bureau": "write", documents: "read" });
  await mk("Ben Test", "bureau", { "espace-bureau": "write", documents: "read" });
  await mk("Cleo Test", "bureau", { "espace-bureau": "read", documents: "read" });
  await mk("Dan Test", undefined, { documents: "read" });
  return admin;
}

test("calcul initial : droits les plus fréquents, admin exclu, catégorie vide = aucun", async () => {
  const admin = await seed();
  const users = await listUsers();
  const r = mostFrequentRights(users, "bureau");
  assert.equal(r["espace-bureau"], "write");
  assert.equal(r.documents, "read");
  assert.equal(r["salle-des-fetes"], "none");
  assert.deepEqual(mostFrequentRights(users, "secretariat"), noRights());
  assert.ok(admin);
  const g = await adminReadGroups(admin);
  assert.deepEqual(g.saved, []);
  assert.equal(g.templates.conseil.documents, "read");
  await assert.rejects(fs.stat(path.join(dir, "hub-groups.json")), "lecture : aucune écriture implicite");
});

test("modèle enregistré : 0600, prioritaire, validé, réservé à l'admin, journalisé", async () => {
  const admin = await seed();
  const membre = (await listUsers()).find((u) => u.identifier === "ana")!;
  assert.equal(await code(adminSetGroupTemplate(membre, { category: "bureau", rights: {} })), "forbidden");
  assert.equal(await code(adminSetGroupTemplate(admin, { category: "admin", rights: {} })), "validation_failed");
  assert.equal(await code(adminSetGroupTemplate(admin, { category: "bureau", rights: { documents: "root" } })), "validation_failed");
  const g = await adminSetGroupTemplate(admin, { category: "bureau", rights: { "actus-agenda": "write" } }, "1.1.1.1");
  assert.deepEqual(g.saved, ["bureau"]);
  assert.equal(g.templates.bureau["actus-agenda"], "write");
  assert.equal(g.templates.bureau.documents, "none");
  assert.equal((await fs.stat(path.join(dir, "hub-groups.json"))).mode & 0o777, 0o600);
  assert.equal((await readAudit()).filter((l) => l.action === "group.template").length, 1);
});

test("aperçu : qui change et quoi, qui est conforme, admin exclu", async () => {
  const admin = await seed();
  const users = await listUsers();
  const plan = planApply(users, "bureau", R({ "espace-bureau": "write", documents: "read" }));
  assert.deepEqual(plan.changed.map((p) => p.identifier), ["cleo"]);
  assert.deepEqual(plan.changed[0].changes, [{ module: "espace-bureau", from: "read", to: "write" }]);
  assert.deepEqual(plan.unchanged.map((p) => p.identifier).sort(), ["ana", "ben"]);
  assert.ok(![...plan.changed, ...plan.unchanged].some((p) => p.id === admin.id));
});

test("application : pose le modèle, exclut l'admin, journalise par compte, idempotente", async () => {
  const admin = await seed();
  await adminSetGroupTemplate(admin, { category: "bureau", rights: { "espace-bureau": "write", "salle-des-fetes": "read" } });
  const before = await getUserById(admin.id);
  const r = await adminApplyGroupTemplate(admin, { category: "bureau" }, "2.2.2.2");
  assert.deepEqual(r.changed.map((p) => p.identifier).sort(), ["ana", "ben", "cleo"]);
  assert.equal(r.unchanged.length, 0);
  const users = await listUsers();
  for (const id of ["ana", "ben", "cleo"]) {
    const u = users.find((x) => x.identifier === id)!;
    assert.equal(u.rights["salle-des-fetes"], "read");
    assert.equal(u.rights.documents, "none");
  }
  assert.equal(users.find((x) => x.identifier === "dan")!.rights.documents, "read", "autre catégorie intacte");
  assert.deepEqual((await getUserById(admin.id))!.rights, before!.rights, "admin intact");
  const lines = (await readAudit()).filter((l) => l.action === "user.group-apply");
  assert.equal(lines.length, 3);
  assert.ok(lines.every((l) => !/hash|password/i.test(JSON.stringify(l))));
  const again = await adminApplyGroupTemplate(admin, { category: "bureau" });
  assert.equal(again.changed.length, 0);
  assert.equal(again.unchanged.length, 3);
  assert.equal((await readAudit()).filter((l) => l.action === "user.group-apply").length, 3);
  assert.equal(await code(adminApplyGroupTemplate(admin, { category: "nope" })), "validation_failed");
});

test("repère « personnalisé »", async () => {
  await seed();
  const users = await listUsers();
  const t = effectiveTemplates(users, { bureau: R({ "espace-bureau": "write", documents: "read" }) });
  const by = (id: string) => users.find((u) => u.identifier === id)!;
  assert.equal(isCustomized(by("ana"), t), false);
  assert.equal(isCustomized(by("cleo"), t), true);
  assert.equal(isCustomized(by("dan"), t), false);
  assert.equal(isCustomized(users.find((u) => u.role === "admin")!, t), false);
});
