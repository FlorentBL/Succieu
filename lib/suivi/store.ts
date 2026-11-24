// Stockage du module « Espace Bureau » : DATA_DIR/espace-bureau.json (écriture atomique, lecture-modification-écriture
// sous verrou). Journal : celui du hub (hub-audit.jsonl), actions préfixées « bureau. ».
// À ne pas confondre avec DATA_DIR/bureau.json (liste de prénoms de l'espace bureau historique).
import { audit } from "../hub/audit";
import { listUsers, type HubUser } from "../hub/users";
import { dataPath, readJson, withLock, writeJson } from "../content/storage";
import { emptyData } from "./model";
import type { Acteur, Noms, SuiviData } from "./types";

export const dataFile = () => dataPath("espace-bureau.json");

export function normalize(v: Partial<SuiviData> | null): SuiviData {
  const base = emptyData();
  return { version: 1, dossiers: v?.dossiers ?? [], listes: { ...base.listes, ...(v?.listes ?? {}) } };
}

export async function readData(): Promise<SuiviData> {
  return normalize(await readJson<Partial<SuiviData> | null>(dataFile(), null));
}

export type AuditInput = { action: string; cible?: string; detail?: string };

/** Applique `fn` sous verrou ; n'écrit que si `fn` réussit, puis journalise. */
export async function mutate<T>(
  acteur: Acteur,
  fn: (data: SuiviData) => { result: T; audit: AuditInput[] },
  ip?: string,
): Promise<T> {
  const { result, lignes } = await withLock(dataFile(), async () => {
    const data = await readData();
    const r = fn(data);
    await writeJson(dataFile(), data);
    return { result: r.result, lignes: r.audit };
  });
  for (const a of lignes) {
    await audit({ actor: acteur.identifier, action: `bureau.${a.action}`, detail: [a.cible, a.detail].filter(Boolean).join(" — ") || undefined, ip });
  }
  return result;
}

export async function auditLecture(acteur: Acteur, action: string, ip?: string): Promise<void> {
  await audit({ actor: acteur.identifier, action: `bureau.${action}`, ip });
}

export const acteurDe = (u: Pick<HubUser, "id" | "displayName" | "identifier">): Acteur => ({ id: u.id, nom: u.displayName, identifier: u.identifier });

/** Comptes du hub (id → nom affiché). Les comptes désactivés restent affichés sur les dossiers existants. */
export async function lireNoms(): Promise<{ noms: Noms; actifs: { id: string; nom: string }[] }> {
  const users = await listUsers();
  return {
    noms: Object.fromEntries(users.map((u) => [u.id, u.displayName])),
    actifs: users.filter((u) => u.active).map((u) => ({ id: u.id, nom: u.displayName })),
  };
}
