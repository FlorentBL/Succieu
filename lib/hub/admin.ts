import { promises as fs } from "node:fs";
import { AppError } from "../content/errors";
import { dataPath } from "../content/storage";
import { checkAdmin } from "./access";
import {
  compareWithDrive,
  driveSyncEnabled,
  ensureDriveAccount,
  findDriveAccount,
  setDriveEnabled,
  type ComparisonRow,
} from "./drive-sync";
import {
  assertIdentifierFree,
  createUser,
  driveLoginOf,
  generatePassword,
  getUserById,
  listUsers,
  normalizeIdentifier,
  parseDriveLogin,
  parseDriveLoginOrNone,
  setActive,
  setDriveState,
  setPassword,
  toPublic,
  updateRoleAndRights,
  validateNewUser,
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
    // Comparaison exacte : l'acteur, ou la cible (1er mot du détail : « identifiant » ou « identifiant (rôle) »).
    if (person && l.actor !== person && (l.detail ?? "").split(" ")[0] !== person) continue;
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

/** Résultat de la synchro d'une action : `disabled` = synchro non configurée (hub seul). */
export type DriveOutcome = { status: "disabled" | "created" | "attached" | "updated" | "error"; error?: string };

const str = (v: unknown) => (typeof v === "string" ? v : undefined);

/** « generate » (défaut) ou « custom » (mot de passe saisi, 10 caractères minimum). */
function chosenPassword(b: Record<string, unknown>): string | undefined {
  if (b.passwordMode === "custom") {
    return str(b.password) ?? "";
  }
  if (b.passwordMode !== undefined && b.passwordMode !== "generate") {
    throw new AppError("validation_failed", "Mode de mot de passe invalide.", { fields: { passwordMode: "generate ou custom." } });
  }
  return undefined;
}

/**
 * Création : le mot de passe (saisi ou généré) est dans la réponse, jamais ailleurs. Le drive passe
 * d'abord : si le compte drive ne peut pas être créé ou rattaché, rien n'est créé dans le hub.
 */
export async function adminCreateUser(admin: HubUser | null, body: unknown, ip?: string) {
  const a = checkAdmin(admin);
  const b = asObject(body);
  const v = validateNewUser({
    displayName: str(b.displayName) ?? "",
    identifier: str(b.identifier),
    role: b.role as "admin" | "membre" | undefined,
    category: b.category,
    moderator: b.moderator,
    rights: b.rights,
    driveLogin: b.driveLogin === null ? null : str(b.driveLogin),
    password: chosenPassword(b),
  });
  await assertIdentifierFree(v.identifier);
  const login = v.driveLogin === undefined ? v.identifier : v.driveLogin;
  let drive: DriveOutcome = { status: "disabled" };
  // login === null : pas de compte drive, aucune opération drive.
  if (login !== null && driveSyncEnabled()) {
    drive = { status: await ensureDriveAccount(login, v.displayName, v.password) };
  }
  const { user, password } = await createUser(
    {
      displayName: v.displayName,
      identifier: v.identifier,
      role: v.role,
      category: v.category,
      moderator: v.moderator,
      rights: v.rights,
      driveLogin: v.driveLogin,
      password: v.password,
      driveSync: drive.status === "disabled" ? undefined : { at: new Date().toISOString() },
    },
    actorOf(a, ip),
  );
  return { user, password, drive };
}

export async function adminUpdateUser(admin: HubUser | null, id: string, body: unknown, ip?: string) {
  const a = checkAdmin(admin);
  const b = asObject(body);
  if (id === a.id && b.role !== undefined && b.role !== a.role) {
    throw selfError("Vous ne pouvez pas modifier votre propre rôle.");
  }
  const by = actorOf(a, ip);
  const current = await getUserById(id);
  if (!current) throw new AppError("not_found", "Compte introuvable.");
  const login = b.driveLogin === undefined ? undefined : parseDriveLoginOrNone(b.driveLogin, current.identifier);
  let user = await updateRoleAndRights(
    id,
    {
      role: b.role as "admin" | "membre" | undefined,
      category: b.category,
      moderator: b.moderator,
      rights: b.rights,
      displayName: typeof b.displayName === "string" ? b.displayName : undefined,
    },
    by,
  );
  if (login !== undefined && login !== driveLoginOf(current)) {
    user = await setDriveState(id, { driveLogin: login, driveSync: {} }, by, "user.drive-login");
  }
  return user;
}

/**
 * Désactivation / réactivation. Le hub change toujours (la sécurité ne dépend pas du drive) ;
 * le drive suit si la synchro est active, l'échec éventuel est consigné et renvoyé.
 */
export async function adminSetActive(admin: HubUser | null, id: string, active: unknown, ip?: string) {
  const a = checkAdmin(admin);
  if (typeof active !== "boolean") {
    throw new AppError("validation_failed", "Valeur invalide.", { fields: { active: "true ou false." } });
  }
  if (id === a.id && !active) throw selfError("Vous ne pouvez pas désactiver votre propre compte.");
  const by = actorOf(a, ip);
  let user = await setActive(id, active, by);
  if (!driveSyncEnabled() || user.driveLogin === null) return { user, drive: { status: "disabled" } as DriveOutcome };
  try {
    await setDriveEnabled(user.driveLogin, active);
    user = await setDriveState(id, { driveSync: { at: new Date().toISOString() } }, by);
    return { user, drive: { status: "updated" } as DriveOutcome };
  } catch (e) {
    const error = e instanceof AppError ? e.message : "Synchronisation avec le drive impossible.";
    user = await setDriveState(id, { driveSync: { at: user.driveSync?.at, error } }, by);
    return { user, drive: { status: "error", error } as DriveOutcome };
  }
}

/**
 * Réinitialisation : mot de passe saisi ou généré. Le drive d'abord ; le hub n'enregistre le
 * nouveau mot de passe que si le drive l'a accepté (les deux restent identiques).
 */
export async function adminResetPassword(admin: HubUser | null, id: string, body: unknown = {}, ip?: string) {
  const a = checkAdmin(admin);
  const b = asObject(body ?? {});
  const target = await getUserById(id);
  if (!target) throw new AppError("not_found", "Compte introuvable.");
  const custom = chosenPassword(b);
  const password = custom === undefined ? generatePassword() : custom;
  // Valide (longueur) avant tout appel au drive.
  const by = actorOf(a, ip);
  let drive: DriveOutcome = { status: "disabled" };
  validateNewUser({ displayName: target.displayName, identifier: target.identifier, password });
  const targetLogin = driveLoginOf(target);
  if (targetLogin !== null && driveSyncEnabled()) {
    try {
      drive = { status: await ensureDriveAccount(targetLogin, target.displayName, password) };
    } catch (e) {
      const error = e instanceof AppError ? e.message : "Synchronisation avec le drive impossible.";
      await setDriveState(id, { driveSync: { at: target.driveSync?.at, error } }, by);
      throw e;
    }
  }
  let user: Awaited<ReturnType<typeof setPassword>>;
  try {
    user = await setPassword(id, password, by);
  } catch (e) {
    if (drive.status !== "disabled") {
      const error = "Mots de passe hub et drive différents : refaire la réinitialisation.";
      console.error(`[hub] ${error} (compte ${target.identifier})`);
      await setDriveState(id, { driveSync: { at: target.driveSync?.at, error } }, by).catch(() => undefined);
      throw new AppError("drive_sync_failed", error);
    }
    throw e;
  }
  if (drive.status !== "disabled") user = await setDriveState(id, { driveSync: { at: new Date().toISOString() } }, by);
  return { user, password, drive };
}

/** Écran « Comptes du drive » : comparaison en lecture seule. */
export async function adminDriveCompare(admin: HubUser | null): Promise<{ enabled: boolean; rows: ComparisonRow[] }> {
  checkAdmin(admin);
  if (!driveSyncEnabled()) return { enabled: false, rows: [] };
  return { enabled: true, rows: await compareWithDrive(await listUsers()) };
}

/** « Rattacher » : le compte du hub pointe vers un compte drive existant (aucune écriture sur le drive). */
export async function adminDriveAttach(admin: HubUser | null, body: unknown, ip?: string) {
  const a = checkAdmin(admin);
  const b = asObject(body);
  const id = str(b.userId) ?? "";
  const target = await getUserById(id);
  if (!target) throw new AppError("not_found", "Compte introuvable.");
  if (!driveSyncEnabled()) throw new AppError("validation_failed", "La synchronisation avec le drive n'est pas configurée.");
  if (target.driveLogin === null) {
    throw new AppError("validation_failed", "Ce compte est réglé sans drive : décochez « Ce compte n'a pas de drive » avant de le rattacher.");
  }
  const login = parseDriveLogin(b.driveLogin, target.identifier);
  const account = await findDriveAccount(login);
  if (!account) throw new AppError("not_found", "Aucun compte drive avec cet identifiant.");
  const clash = (await listUsers()).find((u) => u.id !== id && driveLoginOf(u) === login);
  if (clash) throw new AppError("conflict", `Ce compte drive est déjà rattaché à ${clash.displayName}.`);
  return setDriveState(id, { driveLogin: login, driveSync: { at: new Date().toISOString() } }, actorOf(a, ip), "user.drive-attach");
}

export async function adminReadAudit(admin: HubUser | null, person?: string, limit?: number) {
  checkAdmin(admin);
  return readAudit({ person, limit });
}
