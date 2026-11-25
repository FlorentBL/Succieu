/**
 * Droits par catégorie — logique pure (aucune dépendance serveur : utilisable côté client).
 * Les droits restent stockés par personne ; le modèle d'une catégorie ne sert qu'à les poser en une fois.
 */
import { displayCategory, HUB_CATEGORIES, type HubCategory } from "./categories";
import { ACCESS_LEVELS, HUB_MODULES, noRights, type AccessLevel, type ModuleId, type Rights } from "./modules";

type Member = { id: string; identifier: string; displayName: string; role: string; category?: HubCategory; rights: Partial<Rights> };

export type GroupTemplates = Record<HubCategory, Rights>;

/** Membres concernés par le modèle d'une catégorie : jamais les comptes de rôle admin. */
export function membersOf<T extends { role: string; category?: HubCategory }>(users: readonly T[], category: HubCategory): T[] {
  return users.filter((u) => u.role !== "admin" && displayCategory(u) === category);
}

const completeRights = (r: Partial<Rights>): Rights => ({ ...noRights(), ...r });

/** Droits les plus fréquents parmi les membres (égalité : le niveau le plus bas) ; catégorie vide : aucun droit. */
export function mostFrequentRights(users: readonly Member[], category: HubCategory): Rights {
  const members = membersOf(users, category);
  const out = noRights();
  if (members.length === 0) return out;
  for (const m of HUB_MODULES) {
    let best: AccessLevel = "none";
    let bestN = -1;
    for (const lv of ACCESS_LEVELS) {
      const n = members.filter((u) => (u.rights[m.id] ?? "none") === lv).length;
      if (n > bestN) {
        best = lv;
        bestN = n;
      }
    }
    out[m.id] = best;
  }
  return out;
}

/** Modèles effectifs : celui enregistré, sinon calculé (à la lecture, rien n'est écrit). */
export function effectiveTemplates(users: readonly Member[], stored: Partial<Record<HubCategory, Rights>>): GroupTemplates {
  return Object.fromEntries(
    HUB_CATEGORIES.map((c) => [c, stored[c] ? completeRights(stored[c]) : mostFrequentRights(users, c)]),
  ) as GroupTemplates;
}

export type RightChange = { module: ModuleId; from: AccessLevel; to: AccessLevel };
export type PlanEntry = { id: string; identifier: string; displayName: string; changes: RightChange[] };
export type ApplyPlan = { changed: PlanEntry[]; unchanged: PlanEntry[] };

export function diffRights(current: Partial<Rights>, template: Rights): RightChange[] {
  return HUB_MODULES.flatMap((m) => {
    const from = current[m.id] ?? "none";
    return from === template[m.id] ? [] : [{ module: m.id, from, to: template[m.id] }];
  });
}

/** Aperçu : qui change et quoi, qui est déjà conforme (admins exclus). */
export function planApply(users: readonly Member[], category: HubCategory, template: Rights): ApplyPlan {
  const plan: ApplyPlan = { changed: [], unchanged: [] };
  for (const u of membersOf(users, category)) {
    const changes = diffRights(u.rights, template);
    (changes.length ? plan.changed : plan.unchanged).push({ id: u.id, identifier: u.identifier, displayName: u.displayName, changes });
  }
  return plan;
}

/** Repère « personnalisé » : droits différents du modèle de la catégorie (jamais pour un admin). */
export function isCustomized(u: Member, templates: GroupTemplates): boolean {
  if (u.role === "admin") return false;
  return diffRights(u.rights, templates[displayCategory(u) as HubCategory]).length > 0;
}
