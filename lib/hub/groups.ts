import { AppError } from "../content/errors";
import { dataPath, readJson, updateJson, withLock, writeFileAtomic } from "../content/storage";
import { checkAdmin } from "./access";
import { audit } from "./audit";
import { isHubCategory, type HubCategory } from "./categories";
import { effectiveTemplates, planApply, type ApplyPlan, type GroupTemplates } from "./group-rights";
import type { Rights } from "./modules";
import { listUsers, parseRights, type Actor, type HubUser } from "./users";

type Stored = Partial<Record<HubCategory, Rights>>;
const groupsFile = () => dataPath("hub-groups.json");

export function parseCategoryStrict(v: unknown): HubCategory {
  if (!isHubCategory(v)) {
    throw new AppError("validation_failed", "Catégorie invalide.", { fields: { category: "bureau, conseil ou secretariat." } });
  }
  return v;
}

/** Modèles effectifs (enregistré, sinon droits les plus fréquents) + catégories dont le modèle est enregistré. */
export async function readGroupTemplates(): Promise<{ templates: GroupTemplates; saved: HubCategory[] }> {
  const stored = await readJson<Stored>(groupsFile(), {});
  const users = await listUsers();
  return {
    templates: effectiveTemplates(users, stored),
    saved: (Object.keys(stored) as HubCategory[]).filter(isHubCategory),
  };
}

export async function adminReadGroups(admin: HubUser | null) {
  checkAdmin(admin);
  return readGroupTemplates();
}

/** Enregistre le modèle d'une catégorie (écriture atomique, 0600). */
export async function adminSetGroupTemplate(admin: HubUser | null, body: unknown, ip?: string) {
  const a = checkAdmin(admin);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("validation_failed", "Corps invalide.");
  const b = body as Record<string, unknown>;
  const category = parseCategoryStrict(b.category);
  const rights = parseRights(b.rights);
  const file = groupsFile();
  await withLock(file, async () => {
    const cur = await readJson<Stored>(file, {});
    await writeFileAtomic(file, JSON.stringify({ ...cur, [category]: rights }, null, 2) + "\n", 0o600);
  });
  await audit({ actor: a.identifier, ip, action: "group.template", detail: `${category} rights=${JSON.stringify(rights)}` });
  return readGroupTemplates();
}

/** Pose le modèle (enregistré, sinon calculé) sur tous les comptes de la catégorie, sauf les administrateurs. */
export async function adminApplyGroupTemplate(admin: HubUser | null, body: unknown, ip?: string): Promise<ApplyPlan & { category: HubCategory }> {
  const a = checkAdmin(admin);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("validation_failed", "Corps invalide.");
  const category = parseCategoryStrict((body as Record<string, unknown>).category);
  const stored = await readJson<Stored>(groupsFile(), {});
  const by: Actor = { actor: a.identifier, ip };
  let plan: ApplyPlan = { changed: [], unchanged: [] };
  await updateJson<HubUser[]>(dataPath("users.json"), [], (list) => {
    const template = effectiveTemplates(list, stored)[category];
    plan = planApply(list, category, template);
    const ids = new Set(plan.changed.map((p) => p.id));
    if (ids.size === 0) return list;
    const now = new Date().toISOString();
    return list.map((u) => (ids.has(u.id) ? { ...u, rights: { ...template }, updatedAt: now } : u));
  });
  for (const p of plan.changed) {
    await audit({
      ...by,
      action: "user.group-apply",
      detail: `${p.identifier} category=${category} ${p.changes.map((c) => `${c.module}:${c.from}>${c.to}`).join(",")}`,
    });
  }
  return { category, ...plan };
}
