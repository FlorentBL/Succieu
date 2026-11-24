import { randomBytes, randomInt } from "node:crypto";
import { AppError } from "../content/errors";
import { dataPath, readJson, updateJson } from "../content/storage";
import { hashPassword } from "../auth/password";
import { audit } from "./audit";
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

export type HubUser = {
  id: string;
  /** Prénom en minuscules sans accent, unique. */
  identifier: string;
  displayName: string;
  role: HubRole;
  active: boolean;
  passwordHash: string;
  /** Incrémentée à chaque changement de mot de passe : invalide les sessions. */
  passwordVersion: number;
  mustChangePassword: boolean;
  rights: Rights;
  createdAt: string;
  updatedAt: string;
};

/** Vue sans empreinte, destinée aux réponses API. */
export type PublicUser = Omit<HubUser, "passwordHash" | "passwordVersion">;

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

export function toPublic(u: HubUser): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, passwordVersion, ...rest } = u;
  return { ...rest, rights: effectiveRights(u) };
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

/** Mot de passe provisoire lisible : 3 groupes de 4, sans caractères ambigus. */
export function generateTemporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const group = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

export async function listUsers(): Promise<HubUser[]> {
  return readJson<HubUser[]>(usersFile(), []);
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
  rights?: unknown;
  /** Mot de passe imposé (CLI du premier admin) ; sinon provisoire généré. */
  password?: string;
};

/**
 * Crée un compte. Sans `password`, génère un mot de passe provisoire (renvoyé
 * une seule fois) et force son changement à la première connexion.
 */
export async function createUser(
  input: CreateUserInput,
  by: Actor,
): Promise<{ user: PublicUser; temporaryPassword?: string }> {
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
  const rights = parseRights(input.rights);
  const temporaryPassword = input.password === undefined ? generateTemporaryPassword() : undefined;
  const password = input.password === undefined ? temporaryPassword! : validateNewPassword(input.password);
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const user: HubUser = {
    id: randomBytes(12).toString("hex"),
    identifier,
    displayName,
    role,
    active: true,
    passwordHash,
    passwordVersion: 1,
    mustChangePassword: temporaryPassword !== undefined,
    rights,
    createdAt: now,
    updatedAt: now,
  };
  await updateJson<HubUser[]>(usersFile(), [], (list) => {
    if (list.some((u) => u.identifier === identifier)) {
      throw new AppError("validation_failed", "Cet identifiant existe déjà.", {
        fields: { identifier: "Déjà utilisé." },
      });
    }
    return [...list, user];
  });
  await audit({ ...by, action: "user.create", detail: `${identifier} (${role})` });
  return { user: toPublic(user), temporaryPassword };
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
    const next = { ...fn(list[i], list), updatedAt: new Date().toISOString() };
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

/** Réinitialise : nouveau mot de passe provisoire (renvoyé une seule fois). */
export async function resetPassword(
  id: string,
  by: Actor,
): Promise<{ user: PublicUser; temporaryPassword: string }> {
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const u = await mutate(
    id,
    by,
    "user.reset-password",
    (u) => ({ ...u, passwordHash, passwordVersion: u.passwordVersion + 1, mustChangePassword: true }),
    (u) => u.identifier,
  );
  return { user: toPublic(u), temporaryPassword };
}

/** Change rôle et/ou droits. */
export async function updateRoleAndRights(
  id: string,
  patch: { role?: HubRole; rights?: unknown; displayName?: string },
  by: Actor,
): Promise<PublicUser> {
  if (patch.role !== undefined && patch.role !== "admin" && patch.role !== "membre") {
    throw new AppError("validation_failed", "Rôle invalide.", { fields: { role: "admin ou membre." } });
  }
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
      return { ...u, role, rights: rights ?? u.rights, displayName: displayName ?? u.displayName };
    },
    (u) => `${u.identifier} role=${u.role} rights=${JSON.stringify(effectiveRights(u))}`,
  );
  return toPublic(u);
}

/** Changement par l'intéressé : l'ancien mot de passe a déjà été vérifié. */
export async function setOwnPassword(id: string, newPassword: string, by: Actor): Promise<HubUser> {
  const pw = validateNewPassword(newPassword);
  const passwordHash = await hashPassword(pw);
  return mutate(
    id,
    by,
    "user.change-password",
    (u) => ({ ...u, passwordHash, passwordVersion: u.passwordVersion + 1, mustChangePassword: false }),
    (u) => u.identifier,
  );
}

