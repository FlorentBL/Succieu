import { promises as fs } from "node:fs";
import path from "node:path";
import { ensurePrivateDir, withLock, writeFileAtomic } from "../content/storage";
import { findConflicts, isIsoDate, normalizeStored } from "./logic";
import { auditFile, readAudit, reservationsFile } from "./store";
import type { AuditEvent, Reservation } from "./types";
import { readJson } from "../content/storage";

export type ImportReport = {
  dryRun: boolean;
  reservations: { read: number; added: number; alreadyPresent: number; invalid: { id: string; reason: string }[] };
  audit: { read: number; added: number; alreadyPresent: number; invalid: number };
  warnings: string[];
};

async function readSource<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/**
 * Import idempotent depuis l'ancienne appli (reservations.json, audit-log.json) :
 * une réservation ou un événement déjà présent (même id) n'est jamais écrasé.
 * Les comptes (web-users.json) ne sont volontairement pas lus.
 */
export async function importFromLegacy(sourceDir: string, opts: { dryRun?: boolean } = {}): Promise<ImportReport> {
  const dryRun = !!opts.dryRun;
  const src = await readSource<{ reservations?: Record<string, unknown>[] }>(path.join(sourceDir, "reservations.json"));
  if (!src || !Array.isArray(src.reservations)) throw new Error(`reservations.json introuvable ou invalide dans ${sourceDir}`);
  const srcAudit = await readSource<{ events?: AuditEvent[] }>(path.join(sourceDir, "audit-log.json"));

  const report: ImportReport = {
    dryRun,
    reservations: { read: src.reservations.length, added: 0, alreadyPresent: 0, invalid: [] },
    audit: { read: srcAudit?.events?.length ?? 0, added: 0, alreadyPresent: 0, invalid: 0 },
    warnings: [],
  };
  if (!srcAudit) report.warnings.push("audit-log.json absent : journal non importé.");

  await ensurePrivateDir(path.dirname(reservationsFile()));
  await withLock(reservationsFile(), async () => {
    const current = await readJson<{ reservations?: Record<string, unknown>[] }>(reservationsFile(), {});
    const db: Reservation[] = (current.reservations ?? []).map(normalizeStored);
    const known = new Set(db.map((r) => r.id));
    const added: Reservation[] = [];
    for (const raw of src.reservations!) {
      const r = normalizeStored(raw);
      const reason = !r.id ? "identifiant manquant" : !isIsoDate(r.startDate) || !isIsoDate(r.endDate) || r.endDate < r.startDate ? "dates invalides" : "";
      if (reason) {
        report.reservations.invalid.push({ id: r.id || "(sans id)", reason });
        continue;
      }
      if (known.has(r.id)) {
        report.reservations.alreadyPresent += 1;
        continue;
      }
      known.add(r.id);
      added.push(r);
    }
    report.reservations.added = added.length;
    const merged = [...db, ...added];
    const blocking = merged.filter((r) => ["demande", "option", "confirmee"].includes(r.status));
    let overlaps = 0;
    for (const r of added) if (["demande", "option", "confirmee"].includes(r.status)) overlaps += findConflicts(blocking, r, r.id).length;
    if (overlaps) report.warnings.push(`${overlaps} chevauchement(s) de salle parmi les réservations actives importées (repris tels quels, à vérifier).`);

    const existingAudit = new Set((await readAudit()).map((e) => e.id));
    const lines: string[] = [];
    for (const e of srcAudit?.events ?? []) {
      if (!e || typeof e.id !== "string" || typeof e.reservationId !== "string" || typeof e.at !== "string") {
        report.audit.invalid += 1;
        continue;
      }
      if (existingAudit.has(e.id)) {
        report.audit.alreadyPresent += 1;
        continue;
      }
      existingAudit.add(e.id);
      const ev: AuditEvent = {
        id: e.id,
        reservationId: e.reservationId,
        action: e.action,
        actor: String(e.actor || "systeme"),
        at: e.at,
        before: e.before ? normalizeStored(e.before as unknown as Record<string, unknown>) : null,
        after: e.after ? normalizeStored(e.after as unknown as Record<string, unknown>) : null,
      };
      lines.push(JSON.stringify(ev));
    }
    report.audit.added = lines.length;

    if (dryRun) return;
    if (added.length || !current.reservations) {
      await writeFileAtomic(reservationsFile(), JSON.stringify({ reservations: merged }, null, 2) + "\n", 0o600);
    }
    if (lines.length) {
      await ensurePrivateDir(path.dirname(auditFile()));
      await fs.appendFile(auditFile(), lines.join("\n") + "\n", { mode: 0o600 });
      await fs.chmod(auditFile(), 0o600);
    }
  });
  return report;
}

export function formatReport(r: ImportReport): string {
  const out = [
    `Import salle des fêtes${r.dryRun ? " (simulation, rien n'est écrit)" : ""}`,
    `Réservations : ${r.reservations.read} lues, ${r.reservations.added} ajoutées, ${r.reservations.alreadyPresent} déjà présentes, ${r.reservations.invalid.length} ignorées`,
    ...r.reservations.invalid.map((i) => `  - ${i.id} : ${i.reason}`),
    `Journal : ${r.audit.read} lus, ${r.audit.added} ajoutés, ${r.audit.alreadyPresent} déjà présents, ${r.audit.invalid} ignorés`,
    ...r.warnings.map((w) => `Attention : ${w}`),
  ];
  return out.join("\n");
}
