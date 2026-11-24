import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { AppError } from "../content/errors";
import { dataPath, ensurePrivateDir, readJson, withLock, writeFileAtomic } from "../content/storage";
import {
  buildDashboard,
  conflictMessage,
  filterReservations,
  findConflicts,
  isBlocking,
  normalizeStatus,
  normalizeStored,
  parseFields,
  project,
  todayParis,
  type Query,
} from "./logic";
import type { AuditEvent, Dashboard, Reservation, ReservationLite, Status } from "./types";

/** Données : DATA_DIR/salle-des-fetes/reservations.json (+ audit.jsonl), 0600. */
const dir = () => dataPath("salle-des-fetes");
export const reservationsFile = () => `${dir()}/reservations.json`;
export const auditFile = () => `${dir()}/audit.jsonl`;

type Db = { reservations: Reservation[] };

async function readDb(): Promise<Db> {
  const raw = await readJson<{ reservations?: Record<string, unknown>[] }>(reservationsFile(), {});
  return { reservations: (raw.reservations ?? []).map(normalizeStored) };
}

async function writeDb(db: Db): Promise<void> {
  await writeFileAtomic(reservationsFile(), JSON.stringify(db, null, 2) + "\n", 0o600);
}

/** Écriture sérialisée : lecture, mutation, écriture atomique, puis événements d'audit. */
async function mutate<T>(fn: (db: Db) => { result: T; events: Omit<AuditEvent, "id" | "at">[] }): Promise<T> {
  await ensurePrivateDir(dir());
  return withLock(reservationsFile(), async () => {
    const db = await readDb();
    const { result, events } = fn(db);
    await writeDb(db);
    await appendAudit(events);
    return result;
  });
}

export async function appendAudit(events: Omit<AuditEvent, "id" | "at">[], at = new Date().toISOString()): Promise<void> {
  if (!events.length) return;
  const lines = events.map((e) => JSON.stringify({ id: randomUUID(), at, ...e })).join("\n") + "\n";
  await ensurePrivateDir(dir());
  await fs.appendFile(auditFile(), lines, { mode: 0o600 });
  await fs.chmod(auditFile(), 0o600);
}

export async function readAudit(): Promise<AuditEvent[]> {
  try {
    const text = await fs.readFile(auditFile(), "utf8");
    return text.split("\n").flatMap((l) => {
      if (!l.trim()) return [];
      try {
        return [JSON.parse(l) as AuditEvent];
      } catch {
        return [];
      }
    });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

export async function listAudit(opts: { reservationId?: string; limit?: number }): Promise<AuditEvent[]> {
  const limit = Math.min(Math.max(opts.limit || 100, 1), 500);
  return (await readAudit())
    .filter((e) => !opts.reservationId || e.reservationId === opts.reservationId)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit);
}

const snap = (r: Reservation): Reservation => structuredClone(r);
const notFound = () => new AppError("not_found", "Réservation introuvable.");
const stale = () =>
  new AppError("stale_revision", "Cette réservation a été modifiée par une autre personne. Rechargez-la avant de recommencer.");

function checkRevision(r: Reservation, expected: unknown) {
  if (expected !== undefined && expected !== null && Number(expected) !== r.revision) throw stale();
}

function throwConflicts(conflicts: ReturnType<typeof findConflicts>, fallback?: string): never {
  throw new AppError("conflict", conflictMessage(conflicts, fallback), { details: { conflicts } });
}

/* ───────────── Lecture ───────────── */

export async function listReservations(query: Query, canWrite: boolean): Promise<(Reservation | ReservationLite)[]> {
  const { reservations } = await readDb();
  return filterReservations(reservations, query, { fullSearch: canWrite }).map((r) => project(r, canWrite));
}

export async function getReservation(id: string, canWrite: boolean): Promise<Reservation | ReservationLite> {
  const r = (await readDb()).reservations.find((x) => x.id === id);
  if (!r) throw notFound();
  return project(r, canWrite);
}

export async function getDashboard(canWrite: boolean): Promise<Dashboard> {
  return buildDashboard((await readDb()).reservations, todayParis(), canWrite);
}

/** Toutes les réservations (usage interne : projection publique future, résumé de tuile). */
export async function allReservations(): Promise<Reservation[]> {
  return (await readDb()).reservations;
}

/* ───────────── Écriture ───────────── */

function newId(): string {
  return `RES-${todayParis().replaceAll("-", "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function createReservation(body: unknown, actor: string): Promise<Reservation> {
  const today = todayParis();
  const requested = normalizeStatus((body as { status?: unknown })?.status ?? "confirmee");
  if (!requested) throw new AppError("validation_failed", "Statut invalide.", { fields: { status: "Statut invalide." } });
  const fields = parseFields(body, { today, checkStartInPast: true });
  return mutate((db) => {
    if (isBlocking(requested)) {
      const c = findConflicts(db.reservations, fields);
      if (c.length) throwConflicts(c);
    }
    const r: Reservation = {
      id: newId(),
      status: requested,
      revision: 1,
      ...fields,
      createdAt: new Date().toISOString(),
    };
    if (requested === "annulee") {
      r.cancelledAt = r.createdAt;
    }
    db.reservations.push(r);
    return { result: r, events: [{ reservationId: r.id, action: "creation", actor, before: null, after: snap(r) }] };
  });
}

export async function updateReservation(id: string, body: unknown, actor: string): Promise<Reservation> {
  const b = (body ?? {}) as { status?: unknown; revision?: unknown };
  const fields = parseFields(body, { today: todayParis(), checkStartInPast: false });
  return mutate((db) => {
    const r = db.reservations.find((x) => x.id === id);
    if (!r) throw notFound();
    const before = snap(r);
    const requested = b.status === undefined ? r.status : normalizeStatus(b.status);
    if (!requested) throw new AppError("validation_failed", "Statut invalide.", { fields: { status: "Statut invalide." } });
    checkRevision(r, b.revision);
    if (isBlocking(requested)) {
      const c = findConflicts(db.reservations, fields, id);
      if (c.length) throwConflicts(c);
    }
    Object.assign(r, fields, { status: requested, revision: r.revision + 1, updatedAt: new Date().toISOString() });
    if (!fields.publicTitle) delete r.publicTitle;
    if (requested === "annulee") {
      if (before.status !== "annulee") r.statusBeforeCancellation = before.status;
      r.cancelledAt ||= r.updatedAt;
    } else {
      delete r.cancelledAt;
      delete r.statusBeforeCancellation;
    }
    const events: Omit<AuditEvent, "id" | "at">[] = [{ reservationId: id, action: "modification", actor, before, after: snap(r) }];
    if (before.status !== requested) {
      events.push({ reservationId: id, action: "changement_statut", actor, before, after: snap(r) });
    }
    return { result: r, events };
  });
}

export async function cancelReservation(id: string, actor: string): Promise<Reservation> {
  return mutate((db) => {
    const r = db.reservations.find((x) => x.id === id);
    if (!r) throw notFound();
    if (r.status === "annulee") return { result: r, events: [] };
    const before = snap(r);
    r.statusBeforeCancellation = r.status;
    r.status = "annulee";
    r.revision += 1;
    r.cancelledAt = r.updatedAt = new Date().toISOString();
    return { result: r, events: [{ reservationId: id, action: "suppression", actor, before, after: snap(r) }] };
  });
}

/** Restauration revalidée : le créneau doit être encore libre. */
export async function restoreReservation(id: string, status: unknown, actor: string, revision?: unknown): Promise<Reservation> {
  return mutate((db) => {
    const r = db.reservations.find((x) => x.id === id);
    if (!r) throw notFound();
    checkRevision(r, revision);
    if (r.status !== "annulee") throw new AppError("invalid_transition", "Cette réservation n'est pas annulée.");
    const restored = normalizeStatus(status) || r.statusBeforeCancellation || "demande";
    if (restored === "annulee") throw new AppError("validation_failed", "Statut de restauration invalide.");
    const c = findConflicts(db.reservations, r, id);
    if (c.length) throwConflicts(c, "La restauration créerait un conflit de salle.");
    const before = snap(r);
    r.status = restored;
    r.revision += 1;
    r.updatedAt = new Date().toISOString();
    delete r.cancelledAt;
    delete r.statusBeforeCancellation;
    return { result: r, events: [{ reservationId: id, action: "restauration", actor, before, after: snap(r) }] };
  });
}

export async function changeStatus(id: string, status: unknown, actor: string, revision?: unknown): Promise<Reservation> {
  const next = normalizeStatus(status);
  if (!next) throw new AppError("validation_failed", "Statut invalide.", { fields: { status: "Statut invalide." } });
  return mutate((db) => {
    const r = db.reservations.find((x) => x.id === id);
    if (!r) throw notFound();
    checkRevision(r, revision);
    if (r.status === next) return { result: r, events: [] };
    if (isBlocking(next)) {
      const c = findConflicts(db.reservations, r, id);
      if (c.length) throwConflicts(c, "Ce statut créerait un conflit de salle.");
    }
    const before = snap(r);
    const old: Status = r.status;
    r.status = next;
    r.revision += 1;
    r.updatedAt = new Date().toISOString();
    if (next === "annulee") {
      r.statusBeforeCancellation = old;
      r.cancelledAt = r.updatedAt;
    } else {
      delete r.cancelledAt;
      delete r.statusBeforeCancellation;
    }
    return { result: r, events: [{ reservationId: id, action: "changement_statut", actor, before, after: snap(r) }] };
  });
}
