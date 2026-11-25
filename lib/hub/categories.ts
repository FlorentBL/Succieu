/**
 * Catégorie d'un compte du hub : simple étiquette d'affichage, elle ne fixe AUCUN droit
 * (les droits se règlent personne par personne). Module sans dépendance serveur : utilisable côté client.
 */
export const HUB_CATEGORIES = ["bureau", "conseil", "secretariat"] as const;
export type HubCategory = (typeof HUB_CATEGORIES)[number];

/** Catégorie affichée : un administrateur est « Admin », un compte sans catégorie est « Conseil ». */
export type DisplayCategory = "admin" | HubCategory;

/** Ordre d'affichage des groupes du tableau. */
export const DISPLAY_CATEGORY_ORDER: readonly DisplayCategory[] = ["admin", "bureau", "conseil", "secretariat"];

export const CATEGORY_LABEL: Record<DisplayCategory, string> = {
  admin: "Admin",
  bureau: "Bureau",
  conseil: "Conseil",
  secretariat: "Secrétariat",
};

export function isHubCategory(v: unknown): v is HubCategory {
  return typeof v === "string" && (HUB_CATEGORIES as readonly string[]).includes(v);
}

export function displayCategory(u: { role: string; category?: HubCategory }): DisplayCategory {
  return u.role === "admin" ? "admin" : (u.category ?? "conseil");
}

/** Groupe les comptes par catégorie affichée (ordre fixe, groupes vides omis), tri alphabétique dans chaque groupe. */
export function groupByCategory<T extends { role: string; category?: HubCategory; displayName: string }>(
  users: readonly T[],
): { category: DisplayCategory; users: T[] }[] {
  return DISPLAY_CATEGORY_ORDER.map((category) => ({
    category,
    users: users
      .filter((u) => displayCategory(u) === category)
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr", { sensitivity: "base" })),
  })).filter((g) => g.users.length > 0);
}

/** « 16 comptes · 1 admin · 6 bureau · 8 conseil · 1 secrétariat » (catégories vides omises). */
export function categorySummary(users: readonly { role: string; category?: HubCategory }[]): string {
  const n = users.length;
  const parts = DISPLAY_CATEGORY_ORDER.map((c) => ({ c, k: users.filter((u) => displayCategory(u) === c).length }))
    .filter((p) => p.k > 0)
    .map((p) => `${p.k} ${CATEGORY_LABEL[p.c].toLowerCase()}`);
  return [`${n} compte${n > 1 ? "s" : ""}`, ...parts].join(" · ");
}
