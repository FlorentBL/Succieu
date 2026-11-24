import { promises as fs } from "node:fs";
import { AppError } from "../content/errors";
import {
  createUser,
  listUsers,
  normalizeIdentifier,
  parseRights,
  type HubRole,
  type HubUser,
} from "./users";

/** Ligne de la liste fournie hors dépôt (jamais versionnée). */
export type AccountSpec = {
  displayName: string;
  identifier?: string;
  role?: HubRole;
  rights?: unknown;
};

export type PlannedAccount = {
  displayName: string;
  identifier: string;
  role: HubRole;
  rights: unknown;
};

export type AccountsReport = {
  /** Comptes créés (ou à créer en dry-run). Aucun mot de passe ici. */
  created: { identifier: string; role: HubRole }[];
  /** Comptes déjà présents : laissés intacts (mot de passe inchangé). */
  existing: string[];
};

/**
 * Valide la liste entière avant toute écriture (tout ou rien) : champs,
 * rôles, droits, doublons d'identifiant.
 */
export function parseAccountSpecs(input: unknown): PlannedAccount[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new AppError("validation_failed", "La liste des comptes doit être un tableau non vide.");
  }
  const seen = new Set<string>();
  return input.map((raw, i) => {
    const where = `Ligne ${i + 1}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new AppError("validation_failed", `${where} : objet attendu.`);
    }
    const s = raw as AccountSpec;
    const displayName = typeof s.displayName === "string" ? s.displayName.trim() : "";
    if (!displayName || displayName.length > 80) {
      throw new AppError("validation_failed", `${where} : nom affiché invalide (1 à 80 caractères).`);
    }
    const identifier = normalizeIdentifier(s.identifier ?? displayName.split(/\s+/)[0]);
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(identifier)) {
      throw new AppError("validation_failed", `${where} : identifiant invalide.`);
    }
    if (seen.has(identifier)) {
      throw new AppError("validation_failed", `${where} : identifiant « ${identifier} » en double (préciser "identifier").`);
    }
    seen.add(identifier);
    const role = s.role ?? "membre";
    if (role !== "admin" && role !== "membre") {
      throw new AppError("validation_failed", `${where} : rôle invalide (admin ou membre).`);
    }
    parseRights(s.rights); // lève si module ou niveau inconnu
    return { displayName, identifier, role, rights: s.rights };
  });
}

/** Une personne de la fiche imprimable. */
export function sheetBlock(
  p: { displayName: string; identifier: string; password: string },
  siteUrl: string,
): string {
  return [
    `Espace Bureau — ${siteUrl}/espace-bureau/connexion`,
    "",
    `Nom         : ${p.displayName}`,
    `Identifiant : ${p.identifier}`,
    `Mot de passe provisoire : ${p.password}`,
    "",
    "À la première connexion, le site vous demandera de choisir votre propre mot de passe.",
    "Cette fiche est personnelle : à remettre en main propre, puis à détruire.",
    "",
  ].join("\n");
}

/**
 * Crée les comptes manquants. Idempotent : un identifiant déjà présent n'est
 * ni modifié ni réinitialisé. Les mots de passe provisoires vont UNIQUEMENT
 * dans la fiche (fichier 0600, créé sans écraser), jamais dans le rapport.
 */
export async function migrateAccounts(
  specs: PlannedAccount[],
  opts: { apply: boolean; sheetPath?: string; siteUrl?: string },
): Promise<AccountsReport> {
  const existingIds = new Set((await listUsers()).map((u: HubUser) => u.identifier));
  const report: AccountsReport = { created: [], existing: [] };
  const todo = specs.filter((s) => {
    if (existingIds.has(s.identifier)) {
      report.existing.push(s.identifier);
      return false;
    }
    return true;
  });
  if (!opts.apply) {
    report.created = todo.map((s) => ({ identifier: s.identifier, role: s.role }));
    return report;
  }
  if (todo.length === 0) return report;
  if (!opts.sheetPath) throw new AppError("validation_failed", "Chemin de la fiche imprimable requis.");
  // 'wx' : refuse d'écraser une fiche existante ; 0600 dès la création.
  const fh = await fs.open(opts.sheetPath, "wx", 0o600);
  try {
    for (const s of todo) {
      const { user, temporaryPassword } = await createUser(
        { displayName: s.displayName, identifier: s.identifier, role: s.role, rights: s.rights },
        { actor: "migration" },
      );
      // Écriture immédiate : un arrêt en cours de route ne perd aucun mot de passe déjà créé.
      await fh.appendFile(`${sheetBlock({ displayName: user.displayName, identifier: user.identifier, password: temporaryPassword! }, opts.siteUrl ?? "https://succieu.fr")}\f\n`);
      report.created.push({ identifier: user.identifier, role: user.role });
    }
  } finally {
    await fh.close();
  }
  return report;
}

export function formatAccountsReport(r: AccountsReport, apply: boolean): string {
  const head = apply ? "Comptes — création" : "Comptes — simulation (rien n'est écrit)";
  return [
    head,
    `  ${apply ? "créés" : "à créer"} : ${r.created.length}${r.created.length ? ` (${r.created.map((c) => `${c.identifier}/${c.role}`).join(", ")})` : ""}`,
    `  déjà présents (inchangés) : ${r.existing.length}${r.existing.length ? ` (${r.existing.join(", ")})` : ""}`,
  ].join("\n");
}
