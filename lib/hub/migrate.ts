import { promises as fs } from "node:fs";
import { AppError } from "../content/errors";
import { driveSyncEnabled, ensureDriveAccount, findDriveAccount } from "./drive-sync";
import {
  createUser,
  driveLoginOf,
  generatePassword,
  listUsers,
  normalizeIdentifier,
  parseDriveLoginOrNone,
  parseRights,
  setDriveState,
  setPassword,
  parseCategory,
  type HubRole,
} from "./users";
import type { HubCategory } from "./categories";

/** Ligne de la liste fournie hors dépôt (jamais versionnée). */
export type AccountSpec = {
  displayName: string;
  identifier?: string;
  role?: HubRole;
  /** Étiquette d'affichage : bureau, conseil ou secretariat (ne fixe aucun droit). */
  category?: HubCategory;
  rights?: unknown;
  /** Identifiant du compte drive si différent de l'identifiant (ex. « secretariat ») ; `null` = pas de compte drive. */
  driveLogin?: string | null;
};

export type PlannedAccount = {
  displayName: string;
  identifier: string;
  role: HubRole;
  category?: HubCategory;
  rights: unknown;
  driveLogin: string | null;
};

export type AccountsReport = {
  /** Comptes créés (ou à créer en dry-run). Aucun mot de passe ici. */
  created: { identifier: string; role: HubRole }[];
  /** Comptes déjà présents dont le mot de passe a été (ou serait) réinitialisé (--reset-all). */
  reset: string[];
  /** Comptes déjà présents : laissés intacts (mot de passe inchangé). */
  existing: string[];
  /** Comptes drive : à créer / à rattacher (simulation) ou créés / rattachés ; null = synchro désactivée. */
  drive: { created: string[]; attached: string[] } | null;
  /** Comptes non traités (le drive a refusé) : rien n'a changé pour eux, relancer après correction. */
  failed: { identifier: string; error: string }[];
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
    const category = parseCategory(s.category);
    parseRights(s.rights); // lève si module ou niveau inconnu
    const driveLogin = parseDriveLoginOrNone(s.driveLogin, identifier);
    return { displayName, identifier, role, ...(category ? { category } : {}), rights: s.rights, driveLogin };
  });
}

/** Une personne de la fiche imprimable : un seul identifiant et un seul mot de passe pour le site et le drive. */
export function sheetBlock(
  p: { displayName: string; identifier: string; password: string; driveLogin?: string | null },
  siteUrl: string,
  driveUrl?: string,
): string {
  const same = !p.driveLogin || p.driveLogin === p.identifier;
  return [
    `Espace Bureau — ${siteUrl}/espace-bureau/connexion`,
    ...(driveUrl ? [`Drive du bureau — ${driveUrl}`] : []),
    "",
    `Nom         : ${p.displayName}`,
    `Identifiant : ${p.identifier}${driveUrl && !same ? ` (drive : ${p.driveLogin})` : ""}`,
    `Mot de passe : ${p.password}`,
    "",
    driveUrl ? "Même identifiant et même mot de passe pour le site et le drive." : "Mot de passe attribué par l'administrateur.",
    "Il ne se change pas soi-même : en cas d'oubli, s'adresser à l'administrateur.",
    "Cette fiche est personnelle : à remettre en main propre, puis à détruire.",
    "",
  ].join("\n");
}

/**
 * Crée les comptes manquants (hub + drive, même mot de passe) ; `resetExisting` pose aussi un
 * nouveau mot de passe commun aux comptes déjà présents (bascule). Idempotent sans cette option :
 * un identifiant présent n'est ni modifié ni réinitialisé. Pour chaque personne, le drive passe
 * d'abord ; refus du drive ⇒ rien n'est changé pour elle. Les mots de passe vont UNIQUEMENT dans
 * la fiche (fichier 0600, créé sans écraser), jamais dans le rapport ni le journal.
 */
export async function migrateAccounts(
  specs: PlannedAccount[],
  opts: { apply: boolean; sheetPath?: string; siteUrl?: string; driveUrl?: string; resetExisting?: boolean },
): Promise<AccountsReport> {
  const users = await listUsers();
  const byId = new Map(users.map((u) => [u.identifier, u]));
  const sync = driveSyncEnabled();
  const report: AccountsReport = {
    created: [],
    reset: [],
    existing: [],
    drive: sync ? { created: [], attached: [] } : null,
    failed: [],
  };
  const todo = specs.filter((s) => {
    if (byId.has(s.identifier) && !opts.resetExisting) {
      report.existing.push(s.identifier);
      return false;
    }
    return true;
  });
  if (!opts.apply) {
    for (const s of todo) {
      if (byId.has(s.identifier)) report.reset.push(s.identifier);
      else report.created.push({ identifier: s.identifier, role: s.role });
      if (report.drive && s.driveLogin !== null) {
        try {
          (await findDriveAccount(s.driveLogin) ? report.drive.attached : report.drive.created).push(s.driveLogin);
        } catch (e) {
          report.failed.push({ identifier: s.identifier, error: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    return report;
  }
  if (todo.length === 0) return report;
  if (!opts.sheetPath) throw new AppError("validation_failed", "Chemin de la fiche imprimable requis.");
  // 'wx' : refuse d'écraser une fiche existante ; 0600 dès la création.
  const fh = await fs.open(opts.sheetPath, "wx", 0o600);
  try {
    for (const s of todo) {
      const known = byId.get(s.identifier);
      const login = known ? driveLoginOf(known) : s.driveLogin; // null = pas de drive : aucune opération drive
      const password = generatePassword();
      let driveState: "created" | "attached" | undefined;
      try {
        if (sync && login !== null) driveState = await ensureDriveAccount(login, known?.displayName ?? s.displayName, password);
        const by = { actor: "migration" };
        const user = known
          ? await setPassword(known.id, password, by)
          : (
              await createUser(
                {
                  displayName: s.displayName,
                  identifier: s.identifier,
                  role: s.role,
                  category: s.category,
                  rights: s.rights,
                  driveLogin: s.driveLogin,
                  password,
                  driveSync: sync ? { at: new Date().toISOString() } : undefined,
                },
                by,
              )
            ).user;
        if (known && sync && login !== null) await setDriveState(known.id, { driveSync: { at: new Date().toISOString() } }, by);
        // Écriture immédiate : un arrêt en cours de route ne perd aucun mot de passe déjà posé.
        await fh.appendFile(
          `${sheetBlock({ displayName: user.displayName, identifier: user.identifier, password, driveLogin: login }, opts.siteUrl ?? "https://succieu.fr", sync && login !== null ? opts.driveUrl : undefined)}\f\n`,
        );
        if (known) report.reset.push(s.identifier);
        else report.created.push({ identifier: s.identifier, role: s.role });
        if (driveState && login !== null) report.drive![driveState === "created" ? "created" : "attached"].push(login);
      } catch (e) {
        if (!(e instanceof AppError) || e.code !== "drive_sync_failed") throw e;
        report.failed.push({ identifier: s.identifier, error: e.message });
      }
    }
  } finally {
    await fh.close();
  }
  return report;
}

export function formatAccountsReport(r: AccountsReport, apply: boolean): string {
  const head = apply ? "Comptes — création" : "Comptes — simulation (rien n'est écrit)";
  const list = (a: string[]) => (a.length ? ` (${a.join(", ")})` : "");
  return [
    head,
    `  ${apply ? "créés" : "à créer"} : ${r.created.length}${list(r.created.map((c) => `${c.identifier}/${c.role}`))}`,
    ...(r.reset.length ? [`  mot de passe ${apply ? "réinitialisé" : "à réinitialiser"} : ${r.reset.length}${list(r.reset)}`] : []),
    `  déjà présents (inchangés) : ${r.existing.length}${list(r.existing)}`,
    r.drive
      ? `  drive : ${apply ? "créés" : "à créer"} ${r.drive.created.length}${list(r.drive.created)}, ${apply ? "rattachés" : "à rattacher"} ${r.drive.attached.length}${list(r.drive.attached)}`
      : "  drive : synchro désactivée (DRIVE_URL / DRIVE_ADMIN_USER / DRIVE_ADMIN_PASSWORD absents)",
    ...(r.failed.length ? [`  ÉCHECS (inchangés) : ${r.failed.length}`, ...r.failed.map((f) => `    ${f.identifier} : ${f.error}`)] : []),
  ].join("\n");
}
