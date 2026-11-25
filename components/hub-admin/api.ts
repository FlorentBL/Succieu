import type { HubCategory } from "@/lib/hub/categories";
import type { AccessLevel, ModuleId } from "@/lib/hub/modules";

export type Rights = Record<ModuleId, AccessLevel>;
export type AdminUser = {
  id: string;
  identifier: string;
  displayName: string;
  role: "admin" | "membre";
  category?: HubCategory;
  /** Droit individuel de modération (absent = non). */
  moderator?: boolean;
  active: boolean;
  /** null = ce compte n'a pas de drive. */
  driveLogin: string | null;
  driveSync?: { at?: string; error?: string };
  rights: Rights;
  lastLogin: string | null;
};
export type DriveRow = {
  driveLogin: string;
  hub: { id: string; identifier: string; displayName: string; active: boolean } | null;
  drive: { displayName: string; enabled: boolean | null } | null;
  /** Compte technique du drive (administrateur) : jamais rattachable. */
  technical?: boolean;
  status: "ok" | "drive-sans-hub" | "hub-sans-drive" | "desactive-hub-seulement" | "desactive-drive-seulement";
};
export type DriveOutcome = { status: "disabled" | "created" | "attached" | "updated" | "error"; error?: string };
export type AuditLine = { date: string; actor: string; action: string; detail?: string; ip?: string };

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function call<T>(path: string, method: "GET" | "POST" | "PATCH" | "PUT" = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Connexion impossible : vérifiez le réseau et réessayez.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const fields = data?.error?.fields ? Object.values(data.error.fields).join(" ") : "";
    throw new ApiError([data?.error?.message ?? "Erreur inattendue.", fields].filter(Boolean).join(" "), res.status);
  }
  return data as T;
}

export const ACTION_LABEL: Record<string, string> = {
  "login.ok": "Connexion",
  "login.failed": "Échec de connexion",
  "login.blocked": "Connexion bloquée (trop d'essais)",
  "user.create": "Compte créé",
  "user.update": "Rôle ou droits modifiés",
  "user.group-apply": "Droits posés d'après le modèle de la catégorie",
  "group.template": "Modèle de droits d'une catégorie enregistré",
  "user.enable": "Compte réactivé",
  "user.disable": "Compte désactivé",
  "user.reset-password": "Mot de passe réinitialisé",
  "user.drive-sync": "Synchronisation drive",
  "user.drive-login": "Identifiant drive modifié",
  "user.drive-attach": "Compte rattaché au drive",
  "hub.migrate.accounts": "Migration des comptes",
};

export function formatDate(iso: string | null): string {
  if (!iso) return "jamais";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(iso));
}
