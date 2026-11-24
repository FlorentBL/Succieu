import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { after, before, beforeEach, test } from "node:test";
import { AppError } from "../content/errors";
import {
  addDays,
  buildDashboard,
  csvCell,
  filterReservations,
  icsEscape,
  makeCsv,
  makeICalendar,
  normalizeStatus,
  normalizeStored,
  projectPublic,
  todayParis,
} from "./logic";
import { importFromLegacy } from "./import";
import {
  cancelReservation,
  changeStatus,
  createReservation,
  getReservation,
  listAudit,
  listReservations,
  restoreReservation,
  updateReservation,
} from "./store";

let dir: string;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "succieu-sdf-"));
  process.env.DATA_DIR = dir;
});
after(() => fs.rm(dir, { recursive: true, force: true }));
beforeEach(() => fs.rm(path.join(dir, "salle-des-fetes"), { recursive: true, force: true }));

const T = todayParis();
const body = (o: Record<string, unknown> = {}) => ({
  name: "Alice Test", phone: "0600000000", address: "1 rue Fictive", postalCity: "00000 Ville", email: "alice@example.test",
  purpose: "Repas test", startDate: addDays(T, 10), endDate: addDays(T, 11), roomTypes: ["grande"], keyHandover: "veille",
  depositPaid: "non", balancePaid: "non", balanceAtKeys: "oui", status: "confirmee", ...o,
});
async function code(p: Promise<unknown>): Promise<string> {
  try { await p; } catch (e) { if (e instanceof AppError) return e.code; throw e; }
  return "ok";
}

test("statuts : anciennes valeurs anglaises acceptées", () => {
  assert.equal(normalizeStatus("confirmed"), "confirmee");
  assert.equal(normalizeStatus("Annulée"), "annulee");
  assert.equal(normalizeStatus("requested"), "demande");
  assert.equal(normalizeStatus("zzz"), "");
  assert.equal(normalizeStored({ id: "x", date: "2030-01-02", status: "cancelled" }).endDate, "2030-01-02");
});

test("création, validation et fichiers en 0600", async () => {
  assert.equal(await code(createReservation(body({ email: "pasunmail" }), "A")), "validation_failed");
  assert.equal(await code(createReservation(body({ startDate: addDays(T, -1), endDate: addDays(T, 1) }), "A")), "validation_failed");
  assert.equal(await code(createReservation(body({ endDate: addDays(T, 60) }), "A")), "validation_failed");
  assert.equal(await code(createReservation(body({ roomTypes: [] }), "A")), "validation_failed");
  const r = await createReservation(body(), "Alice Test");
  assert.equal(r.revision, 1);
  assert.equal(r.publicVisible, false);
  const f = path.join(dir, "salle-des-fetes");
  assert.equal((await fs.stat(f)).mode & 0o777, 0o700);
  assert.equal((await fs.stat(path.join(f, "reservations.json"))).mode & 0o777, 0o600);
  assert.equal((await fs.stat(path.join(f, "audit.jsonl"))).mode & 0o777, 0o600);
});

test("conflits par salle et période (409 détaillé), salles distinctes compatibles", async () => {
  await createReservation(body(), "A");
  const e = await createReservation(body({ roomTypes: ["grande", "petite"] }), "A").catch((x) => x as AppError);
  assert.ok(e instanceof AppError);
  assert.equal(e.code, "conflict");
  const conflicts = (e.details as { conflicts: { conflictingRooms: string[]; phone?: string }[] }).conflicts;
  assert.deepEqual(conflicts[0].conflictingRooms, ["grande"]);
  assert.equal("phone" in conflicts[0], false);
  await createReservation(body({ roomTypes: ["petite"] }), "A"); // autre salle : ok
  await createReservation(body({ startDate: addDays(T, 12), endDate: addDays(T, 12) }), "A"); // autre période : ok
});

test("annulation réversible, restauration revalidée, révision anti-écrasement", async () => {
  const r = await createReservation(body(), "A");
  const c = await cancelReservation(r.id, "A");
  assert.equal(c.status, "annulee");
  assert.equal(c.statusBeforeCancellation, "confirmee");
  await createReservation(body({ purpose: "Prise du créneau" }), "A"); // le créneau est libre
  assert.equal(await code(restoreReservation(r.id, undefined, "A")), "conflict");
  assert.equal(await code(restoreReservation(r.id, undefined, "A", 1)), "stale_revision");
  const r2 = await createReservation(body({ startDate: addDays(T, 40), endDate: addDays(T, 40) }), "A");
  await cancelReservation(r2.id, "A");
  const back = await restoreReservation(r2.id, undefined, "A");
  assert.equal(back.status, "confirmee");
  assert.equal(back.statusBeforeCancellation, undefined);
  assert.equal(await code(updateReservation(r2.id, { ...body({ startDate: addDays(T, 40), endDate: addDays(T, 40) }), revision: 1 }, "A")), "stale_revision");
  assert.equal(await code(changeStatus(r2.id, "annulee", "A", 1)), "stale_revision");
});

test("journal d'audit", async () => {
  const r = await createReservation(body(), "Alice Test");
  await changeStatus(r.id, "option", "Bob Test");
  await cancelReservation(r.id, "Bob Test");
  const ev = await listAudit({ reservationId: r.id });
  assert.deepEqual(ev.map((e) => e.action).sort(), ["changement_statut", "creation", "suppression"]);
  assert.equal(ev.find((e) => e.action === "creation")?.actor, "Alice Test");
});

test("lecture : pas de coordonnées ni paiements, recherche limitée", async () => {
  const r = await createReservation(body(), "A");
  const lite = (await getReservation(r.id, false)) as Record<string, unknown>;
  for (const k of ["name", "phone", "email", "address", "depositPaid", "balancePaid", "publicVisible"]) assert.equal(k in lite, false, k);
  const month = addDays(T, 10).slice(0, 7);
  assert.equal((await listReservations({ month, q: "alice" }, false)).length, 0);
  assert.equal((await listReservations({ month, q: "alice" }, true)).length, 1);
  assert.equal((await listReservations({ month, q: "repas" }, false)).length, 1);
  const d = buildDashboard([r], T, false);
  assert.equal(d.paymentsDue.length, 0);
  assert.equal("phone" in d.upcoming[0], false);
});

test("filtres statut / salle / mois", () => {
  const a = normalizeStored({ id: "a", startDate: "2030-03-30", endDate: "2030-04-02", status: "confirmed", roomTypes: ["petite"], purpose: "X" });
  const b = normalizeStored({ id: "b", startDate: "2030-03-10", endDate: "2030-03-10", status: "annulee", purpose: "Y" });
  const all = [a, b];
  assert.deepEqual(filterReservations(all, { month: "2030-04" }, { fullSearch: true }).map((x) => x.id), ["a"]);
  assert.deepEqual(filterReservations(all, { month: "2030-03", status: "all" }, { fullSearch: true }).map((x) => x.id), ["b", "a"]);
  assert.deepEqual(filterReservations(all, { status: "cancelled" }, { fullSearch: true }).map((x) => x.id), ["b"]);
  assert.deepEqual(filterReservations(all, { room: "grande", status: "all" }, { fullSearch: true }).map((x) => x.id), ["b"]);
  assert.throws(() => filterReservations(all, { month: "2030-13" }, { fullSearch: true }));
});

test("exports : CSV protégé contre l'injection de formule, ICS valide", () => {
  assert.equal(csvCell("=1+1"), `"'=1+1"`);
  assert.equal(csvCell('a"b'), `"a""b"`);
  const r = normalizeStored({ id: "R1", startDate: "2030-01-30", endDate: "2030-01-31", name: "=CMD()", purpose: "Fête; test, ok", status: "confirmee" });
  assert.match(makeCsv([r]), /"'=CMD\(\)"/);
  const ics = makeICalendar([r]);
  assert.match(ics, /DTEND;VALUE=DATE:20300201/);
  assert.match(ics, /SUMMARY:Fête\\; test\\, ok/);
  assert.equal(icsEscape("a;b,c\\d\ne"), "a\\;b\\,c\\\\d\\ne");
  assert.match(ics, /STATUS:CONFIRMED/);
  assert.ok(ics.includes("Statut: confirmee\\nRéférence: R1"));
  assert.ok(ics.split("\r\n").every((l) => Buffer.byteLength(l) <= 75));
});

test("projection publique : confirmées et visibles seulement, sans données personnelles", () => {
  const mk = (o: Record<string, unknown>) => normalizeStored({ id: "i" + Math.random(), startDate: "2030-05-01", endDate: "2030-05-01", name: "Secret", phone: "06", purpose: "Mariage de X", ...o });
  const out = projectPublic([
    mk({ status: "confirmee", publicVisible: true, publicTitle: "Soirée du comité" }),
    mk({ status: "confirmee" }),
    mk({ status: "option", publicVisible: true }),
    mk({ status: "annulee", publicVisible: true }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].title, "Soirée du comité");
  assert.deepEqual(Object.keys(out[0]).sort(), ["endDate", "id", "rooms", "startDate", "title"]);
});

test("import idempotent (simulation, puis réel, puis relance)", async () => {
  const src = path.join(dir, "legacy");
  await fs.mkdir(src, { recursive: true });
  await fs.writeFile(path.join(src, "reservations.json"), JSON.stringify({ reservations: [
    { id: "RES-OLD-1", date: "2031-06-01", status: "confirmed", name: "Fictif", purpose: "Ancienne", roomTypes: ["grande"] },
    { id: "RES-OLD-2", startDate: "2031-06-01", endDate: "2031-06-02", status: "option", roomTypes: ["grande"], purpose: "Chevauche" },
    { id: "RES-BAD", startDate: "pas-une-date" },
  ] }));
  await fs.writeFile(path.join(src, "audit-log.json"), JSON.stringify({ events: [
    { id: "ev-1", reservationId: "RES-OLD-1", action: "creation", actor: "bob", at: "2031-01-01T10:00:00.000Z", before: null, after: { id: "RES-OLD-1", status: "confirmed", date: "2031-06-01" } },
  ] }));
  const dry = await importFromLegacy(src, { dryRun: true });
  assert.equal(dry.reservations.added, 2);
  assert.equal(dry.reservations.invalid.length, 1);
  assert.equal(dry.warnings.length, 1);
  assert.equal(await fs.stat(path.join(dir, "salle-des-fetes", "reservations.json")).catch(() => null), null);
  const real = await importFromLegacy(src);
  assert.equal(real.reservations.added, 2);
  assert.equal(real.audit.added, 1);
  const again = await importFromLegacy(src);
  assert.equal(again.reservations.added, 0);
  assert.equal(again.reservations.alreadyPresent, 2);
  assert.equal(again.audit.added, 0);
  assert.equal(again.audit.alreadyPresent, 1);
  const stored = (await getReservation("RES-OLD-1", true)) as { status: string; endDate: string; publicVisible: boolean };
  assert.equal(stored.status, "confirmee");
  assert.equal(stored.endDate, "2031-06-01");
  assert.equal(stored.publicVisible, false);
  // script CLI (simulation)
  const out = execFileSync("node", ["scripts/import-salle-des-fetes.mjs", src, "--dry-run"], { env: { ...process.env, DATA_DIR: dir }, encoding: "utf8" });
  assert.match(out, /simulation/);
});
