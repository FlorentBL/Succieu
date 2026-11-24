import { promises as fs } from "node:fs";
import { AppError } from "../content/errors";
import { dataPath } from "../content/storage";
import { checkAdmin } from "./access";
import {
  createUser,
  listUsers,
  normalizeIdentifier,
  resetPassword,
  setActive,
  toPublic,
  updateRoleAndRights,
  type Actor,
  type HubUser,
  type PublicUser,
} from "./users";

/** Entrée du journal telle qu'écrite par `audit()`. */
export type AuditLine = { date: string; actor: string; action: string; detail?: string; ip?: string };
export type AdminUserView = PublicUser & { lastLogin: string | null };

const MAX_AUDIT = 500;

/** Lit les dernières lignes valides du journal (plus récentes d'abord), filtrables par personne. */
export async function readAudit(opts: { person?: string; limit?: number } = {}): Promise<AuditLine[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), MAX_AUDIT);
  const person = opts.person ? normalizeIdentifier(opts.person) : "";
  let raw = "";
  try {
    raw = await fs.readFile(dataPath("hub-audit.jsonl"), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const out: AuditLine[] = [];
  const lines = raw.split("\n");
  for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
    if (!lines[i].trim()) continue;
    let l: AuditLine;
    try {
      l = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (typeof l.action !== "string" || typeof l.actor !== "string") continue;
    if (person && l.actor !== person && !(l.detail ?? "").startsWith(person)) continue;
    out.push(l);
  }
  return out;
}

async function lastLogins(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const l of (await readAudit({ limit: MAX_AUDIT * 20 })).reverse()) {
    if (l.action === "login.ok") map.set(l.actor, l.date);
  }
  return map;
}

export async function adminListUsers(): Promise<AdminUserView[]> {
  const logins = await lastLogins();
  return (await listUsers()).map((u) => ({ ...toPublic(u), lastLogin: logins.get(u.identifier) ?? null }));
}

const actorOf = (admin: HubUser, ip?: string): Actor => ({ actor: admin.identifier, ip });

function selfError(message: string): AppError {
  return new AppError("invalid_transition", message);
}

function asObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("validation_failed", "Corps invalide.");
  }
  return body as Record<string, unknown>;
}

/** Création : le mot de passe provisoire est dans la réponse, jamais ailleurs. */
export async function adminCreateUser(admin: HubUser | null, body: unknown, ip?: string) {
  const a = checkAdmin(admin);
  const b = asObject(body);
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const { user, temporaryPassword } = await createUser(
    {
      displayName: str(b.displayName) ?? "",
      identifier: str(b.identifier),
      role: b.role as "admin" | "membre" | undefined,
      rights: b.rights,
    },
    actorOf(a, ip),
  );
  return { user, temporaryPassword: temporaryPassword! };
}

export async function adminUpdateUser(admin: HubUser | null, id: string, body: unknown, ip?: string) {
  const a = checkAdmin(admin);
  const b = asObject(body);
  if (id === a.id && b.role !== undefined && b.role !== a.role) {
    throw selfError("Vous ne pouvez pas modifier votre propre rôle.");
  }
  return updateRoleAndRights(
    id,
    {
      role: b.role as "admin" | "membre" | undefined,
      rights: b.rights,
      displayName: typeof b.displayName === "string" ? b.displayName : undefined,
    },
    actorOf(a, ip),
  );
}

export async function adminSetActive(admin: HubUser | null, id: string, active: unknown, ip?: string) {
  const a = checkAdmin(admin);
  if (typeof active !== "boolean") {
    throw new AppError("validation_failed", "Valeur invalide.", { fields: { active: "true ou false." } });
  }
  if (id === a.id && !active) throw selfError("Vous ne pouvez pas désactiver votre propre compte.");
  return setActive(id, active, actorOf(a, ip));
}

export async function adminResetPassword(admin: HubUser | null, id: string, ip?: string) {
  const a = checkAdmin(admin);
  if (id === a.id) {
    throw selfError("Pour votre propre mot de passe, utilisez « Changer mon mot de passe ».");
  }
  return resetPassword(id, actorOf(a, ip));
}

export async function adminReadAudit(admin: HubUser | null, person?: string, limit?: number) {
  checkAdmin(admin);
  return readAudit({ person, limit });
}
