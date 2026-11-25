import { randomBytes, randomInt } from "node:crypto";
import { AppError } from "../content/errors";
import { dataPath, readJson, updateJson } from "../content/storage";
import { hashPassword } from "../auth/password";
import { audit } from "./audit";
import { HUB_CATEGORIES, isHubCategory, type HubCategory } from "./categories";
import {
  ACCESS_LEVELS,
  allWrite,
  isModuleId,
  noRights,
  type AccessLevel,
  type ModuleId,
  type Rights,
} from "./modules";

export type HubRole = "admin" | "membre";

export type DriveSyncState = {
  /** Dernière synchronisation réussie (ISO). */
  at?: string;
  /** Dernière erreur de synchronisation (message lisible). */
  error?: string;
};

export type HubUser = {
  id: string;
  /** Prénom en minuscules sans accent, unique. */
  identifier: string;
  displayName: string;
  role: HubRole;
  /** Étiquette d'affichage seulement (ne fixe aucun droit) ; absente = « Conseil ». */
  category?: HubCategory;
  active: boolean;
  passwordHash: string;
  /** Incrémentée à chaque changement de mot de passe : invalide les sessions. */
  passwordVersion: number;
  /** Identifiant du compte sur le drive (oCIS) ; absent = identique à `identifier` ; `null` = pas de compte drive. */
  driveLogin?: string | null;
  /** État de la dernière synchronisation avec le drive (aucun secret). */
  driveSync?: DriveSyncState;
  rights: Rights;
  createdAt: string;
  updatedAt: string;
};

/** Vue sans empreinte, destinée aux réponses API. */
export type PublicUser = Omit<HubUser, "passwordHash" | "passwordVersion" | "driveLogin"> & { driveLogin: string | null };

export type Actor = { actor: string; ip?: string };

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

const usersFile = () => dataPath("users.json");

export function normalizeIdentifier(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

const IDENTIFIER_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;

/** Identifiant du compte drive : celui du hub par défaut ; `null` = ce compte n'a pas de drive (aucune opération drive). */
export const driveLoginOf = (u: Pick<HubUser, "identifier" | "driveLogin">): string | null =>
  u.driveLogin === null ? null : u.driveLogin || u.identifier;

/** Compte administrateur du drive (« admin » ou DRIVE_ADMIN_USER), casse ignorée : jamais rattachable à un compte du hub. */
export function isDriveAdminLogin(login: string, adminUser: string | undefined = process.env.DRIVE_ADMIN_USER): boolean {
  const v = login.trim().toLowerCase();
  return v === "admin" || (!!adminUser?.trim() && v === adminUser.trim().toLowerCase());
}

export const DRIVE_ADMIN_MESSAGE =
  "Ce compte est l'administrateur technique du drive : il ne peut pas être rattaché à un compte du hub.";

/** Valide un identifiant drive (même forme que l'identifiant du hub, point et souligné admis). */
export function parseDriveLogin(raw: unknown, fallback: string): string {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const v = typeof raw === "string" ? normalizeIdentifier(raw) : "";
  // Seul un identifiant drive explicite est refusé ; un compte hub nommé « admin » reste possible
  // (sans synchro : ensureDriveAccount & co refusent ce login).
  if (isDriveAdminLogin(v)) {
    throw new AppError("validation_failed", DRIVE_ADMIN_MESSAGE, { fields: { driveLogin: DRIVE_ADMIN_MESSAGE } });
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(v)) {
    throw new AppError("validation_failed", "Identifiant du drive invalide.", {
      fields: { driveLogin: "Lettres, chiffres, tiret, point ou souligné." },
    });
  }
  return v;
}

/** Comme `parseDriveLogin`, mais `null` explicite = pas de compte drive. */
export function parseDriveLoginOrNone(raw: unknown, fallback: string): string | null {
  return raw === null ? null : parseDriveLogin(raw, fallback);
}

export function toPublic(u: HubUser): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, passwordVersion, ...rest } = u;
  return { ...rest, driveLogin: driveLoginOf(u), rights: effectiveRights(u) };
}

export function effectiveRights(u: Pick<HubUser, "role" | "rights">): Rights {
  return u.role === "admin" ? allWrite() : { ...noRights(), ...u.rights };
}

export function hasAccess(
  u: Pick<HubUser, "role" | "rights">,
  module: ModuleId,
  level: "read" | "write",
): boolean {
  const have = effectiveRights(u)[module];
  return have === "write" || (have === "read" && level === "read");
}

/** Valide une table de droits partielle ; les modules absents valent "none". */
export function parseRights(input: unknown): Rights {
  const rights = noRights();
  if (input === undefined || input === null) return rights;
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("validation_failed", "Droits invalides.", { fields: { rights: "Objet attendu." } });
  }
  for (const [k, v] of Object.entries(input)) {
    if (!isModuleId(k)) {
      throw new AppError("validation_failed", "Droits invalides.", { fields: { rights: `Module inconnu : ${k}.` } });
    }
    if (!ACCESS_LEVELS.includes(v as AccessLevel)) {
      throw new AppError("validation_failed", "Droits invalides.", { fields: { rights: `Niveau invalide pour ${k}.` } });
    }
    rights[k] = v as AccessLevel;
  }
  return rights;
}

export function validateNewPassword(pw: unknown): string {
  if (typeof pw !== "string" || pw.length < MIN_PASSWORD_LENGTH) {
    throw new AppError("validation_failed", `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`, {
      fields: { password: `${MIN_PASSWORD_LENGTH} caractères minimum.` },
    });
  }
  if (pw.length > MAX_PASSWORD_LENGTH) {
    throw new AppError("validation_failed", "Mot de passe trop long.", { fields: { password: "200 caractères maximum." } });
  }
  return pw;
}

/** Mot de passe lisible : 3 groupes de 4, sans caractères ambigus. */
export function generatePassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const group = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

/** Lit les comptes ; l'ancien champ `mustChangePassword` (supprimé) est ignoré s'il traîne dans le fichier. */
export async function listUsers(): Promise<HubUser[]> {
  const list = await readJson<(HubUser & { mustChangePassword?: unknown })[]>(usersFile(), []);
  return list.map((u) => {
    if (!("mustChangePassword" in u)) return u;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { mustChangePassword, ...rest } = u;
    return rest;
  });
}

export async function getUserById(id: string): Promise<HubUser | null> {
  return (await listUsers()).find((u) => u.id === id) ?? null;
}

export async function getUserByIdentifier(identifier: string): Promise<HubUser | null> {
  const key = normalizeIdentifier(identifier);
  return (await listUsers()).find((u) => u.identifier === key) ?? null;
}

const activeAdmins = (list: HubUser[]) => list.filter((u) => u.role === "admin" && u.active);

function notFound(): AppError {
  return new AppError("not_found", "Compte introuvable.");
}

function lastAdminError(): AppError {
  return new AppError("invalid_transition", "Impossible : il doit rester au moins un administrateur actif.");
}

export type CreateUserInput = {
  identifier?: string;
  displayName: string;
  role?: HubRole;
  category?: unknown;
  rights?: unknown;
  /** Mot de passe saisi par l'administrateur ; sinon généré (renvoyé une seule fois). */
  password?: string;
  /** Identifiant du compte drive (défaut : l'identifiant). */
  driveLogin?: string | null;
  driveSync?: DriveSyncState;
};

export type ValidatedNewUser = { identifier: string; displayName: string; role: HubRole; category?: HubCategory; rights: Rights; driveLogin?: string | null; password: string };

/** Valide une catégorie facultative (undefined/null = non précisée). */
export function parseCategory(v: unknown): HubCategory | undefined {
  if (v === undefined || v === null) return undefined;
  if (!isHubCategory(v)) {
    throw new AppError("validation_failed", "Catégorie invalide.", { fields: { category: HUB_CATEGORIES.join(", ") + "." } });
  }
  return v;
}

/** Valide une création sans rien écrire (le mot de passe est généré s'il est absent). */
export function validateNewUser(input: CreateUserInput): ValidatedNewUser {
  const displayName = (input.displayName ?? "").trim();
  if (!displayName || displayName.length > 80) {
    throw new AppError("validation_failed", "Nom affiché invalide.", { fields: { displayName: "1 à 80 caractères." } });
  }
  const identifier = normalizeIdentifier(input.identifier ?? displayName.split(/\s+/)[0]);
  if (!IDENTIFIER_RE.test(identifier)) {
    throw new AppError("validation_failed", "Identifiant invalide.", {
      fields: { identifier: "Lettres, chiffres et tirets, 32 caractères maximum." },
    });
  }
  const role: HubRole = input.role ?? "membre";
  if (role !== "admin" && role !== "membre") {
    throw new AppError("validation_failed", "Rôle invalide.", { fields: { role: "admin ou membre." } });
  }
  const category = parseCategory(input.category);
  const rights = parseRights(input.rights);
  const login = parseDriveLoginOrNone(input.driveLogin, identifier);
  const password = input.password === undefined ? generatePassword() : validateNewPassword(input.password);
  return { identifier, displayName, role, ...(category ? { category } : {}), rights, driveLogin: login === identifier ? undefined : login, password };
}

/** Échoue si l'identifiant existe déjà (vérification avant d'écrire sur le drive). */
export async function assertIdentifierFree(identifier: string): Promise<void> {
  if ((await listUsers()).some((u) => u.identifier === identifier)) {
    throw new AppError("validation_failed", "Cet identifiant existe déjà.", { fields: { identifier: "Déjà utilisé." } });
  }
}

/**
 * Crée un compte. Le mot de passe est choisi par l'administrateur ou généré ; il est
 * renvoyé (`password`) pour être affiché une seule fois, jamais journalisé.
 */
export async function createUser(
  input: CreateUserInput,
  by: Actor,
): Promise<{ user: PublicUser; password: string }> {
  const v = validateNewUser(input);
  const passwordHash = await hashPassword(v.password);
  const now = new Date().toISOString();
  const user: HubUser = {
    id: randomBytes(12).toString("hex"),
    identifier: v.identifier,
    displayName: v.displayName,
    role: v.role,
    ...(v.category ? { category: v.category } : {}),
    active: true,
    passwordHash,
    passwordVersion: 1,
    ...(v.driveLogin === null ? { driveLogin: null } : v.driveLogin ? { driveLogin: v.driveLogin } : {}),
    ...(input.driveSync ? { driveSync: input.driveSync } : {}),
    rights: v.rights,
    createdAt: now,
    updatedAt: now,
  };
  await updateJson<HubUser[]>(usersFile(), [], (list) => {
    if (list.some((u) => u.identifier === v.identifier)) {
      throw new AppError("validation_failed", "Cet identifiant existe déjà.", {
        fields: { identifier: "Déjà utilisé." },
      });
    }
    return [...list, user];
  });
  await audit({ ...by, action: "user.create", detail: `${v.identifier} (${v.role}${v.category ? `, ${v.category}` : ""})` });
  return { user: toPublic(user), password: v.password };
}

async function mutate(
  id: string,
  by: Actor,
  action: string,
  fn: (u: HubUser, list: HubUser[]) => HubUser,
  detail: (u: HubUser) => string,
): Promise<HubUser> {
  let result: HubUser | undefined;
  await updateJson<HubUser[]>(usersFile(), [], (list) => {
    const i = list.findIndex((u) => u.id === id);
    if (i < 0) throw notFound();
    // L'ancien champ `mustChangePassword` (supprimé) disparaît à la première écriture du compte.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { mustChangePassword: _legacy, ...current } = list[i] as HubUser & { mustChangePassword?: unknown };
    const next = { ...fn(current, list), updatedAt: new Date().toISOString() };
    result = next;
    return list.map((u, j) => (j === i ? next : u));
  });
  await audit({ ...by, action, detail: detail(result!) });
  return result!;
}

/** Désactive / réactive : une session ouverte tombe immédiatement. */
export async function setActive(id: string, active: boolean, by: Actor): Promise<PublicUser> {
  const u = await mutate(
    id,
    by,
    active ? "user.enable" : "user.disable",
    (u, list) => {
      if (!active && u.role === "admin" && u.active && activeAdmins(list).length <= 1) throw lastAdminError();
      return { ...u, active };
    },
    (u) => u.identifier,
  );
  return toPublic(u);
}

/** Pose un mot de passe attribué par l'administrateur (les sessions de la personne tombent). */
export async function setPassword(
  id: string,
  password: string,
  by: Actor,
): Promise<PublicUser> {
  const passwordHash = await hashPassword(validateNewPassword(password));
  const u = await mutate(
    id,
    by,
    "user.reset-password",
    (u) => ({ ...u, passwordHash, passwordVersion: u.passwordVersion + 1 }),
    (u) => u.identifier,
  );
  return toPublic(u);
}

/** Identifiant drive et/ou état de synchronisation (aucun secret). */
export async function setDriveState(
  id: string,
  patch: { driveLogin?: string | null; driveSync?: DriveSyncState },
  by: Actor,
  action = "user.drive-sync",
): Promise<PublicUser> {
  const u = await mutate(
    id,
    by,
    action,
    (u) => {
      const next: HubUser = { ...u };
      if (patch.driveLogin !== undefined) {
        if (patch.driveLogin !== null && patch.driveLogin === u.identifier) delete next.driveLogin;
        else next.driveLogin = patch.driveLogin;
      }
      if (patch.driveSync !== undefined) next.driveSync = patch.driveSync;
      return next;
    },
    (u) => `${u.identifier} drive=${driveLoginOf(u)}${u.driveSync?.error ? " erreur" : ""}`,
  );
  return toPublic(u);
}

/** Change rôle et/ou droits. */
export async function updateRoleAndRights(
  id: string,
  patch: { role?: HubRole; category?: unknown; rights?: unknown; displayName?: string },
  by: Actor,
): Promise<PublicUser> {
  if (patch.role !== undefined && patch.role !== "admin" && patch.role !== "membre") {
    throw new AppError("validation_failed", "Rôle invalide.", { fields: { role: "admin ou membre." } });
  }
  const category = parseCategory(patch.category);
  const rights = patch.rights === undefined ? undefined : parseRights(patch.rights);
  const displayName = patch.displayName?.trim();
  if (patch.displayName !== undefined && (!displayName || displayName.length > 80)) {
    throw new AppError("validation_failed", "Nom affiché invalide.", { fields: { displayName: "1 à 80 caractères." } });
  }
  const u = await mutate(
    id,
    by,
    "user.update",
    (u, list) => {
      const role = patch.role ?? u.role;
      if (u.role === "admin" && u.active && role !== "admin" && activeAdmins(list).length <= 1) throw lastAdminError();
      return { ...u, role, ...(category ? { category } : {}), rights: rights ?? u.rights, displayName: displayName ?? u.displayName };
    },
    (u) => `${u.identifier} role=${u.role} category=${u.category ?? "-"} rights=${JSON.stringify(effectiveRights(u))}`,
  );
  return toPublic(u);
}
