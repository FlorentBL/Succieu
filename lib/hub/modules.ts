/**
 * Registre des modules du hub /espace-bureau. Un seul fichier : les volets
 * suivants complètent `description` / `path` ici, jamais ailleurs.
 */
export const HUB_MODULES = [
  {
    id: "actus-agenda",
    icon: "news",
    label: "Actualités & agenda",
    path: "/espace-bureau/actualites",
    description: "Saisie des actualités et des rendez-vous de l'agenda.",
  },
  {
    id: "espace-bureau",
    icon: "people",
    label: "Espace Bureau",
    path: "/espace-bureau/bureau",
    description: "Suivi du bureau municipal.",
  },
  {
    id: "salle-des-fetes",
    icon: "room",
    label: "Salle des fêtes",
    path: "/espace-bureau/salle-des-fetes",
    description: "Réservations et gestion de la salle des fêtes.",
  },
  {
    id: "documents",
    icon: "documents",
    label: "Documents",
    path: "/espace-bureau/documents",
    description: "Accès au drive des documents partagés.",
  },
] as const;

export type HubModule = (typeof HUB_MODULES)[number];
export type ModuleIcon = HubModule["icon"];
export type ModuleId = (typeof HUB_MODULES)[number]["id"];
export const MODULE_IDS: readonly ModuleId[] = HUB_MODULES.map((m) => m.id);

export type AccessLevel = "none" | "read" | "write";
export const ACCESS_LEVELS: readonly AccessLevel[] = ["none", "read", "write"];
export type Rights = Record<ModuleId, AccessLevel>;

export function isModuleId(v: unknown): v is ModuleId {
  return typeof v === "string" && (MODULE_IDS as readonly string[]).includes(v);
}

export function noRights(): Rights {
  return Object.fromEntries(MODULE_IDS.map((id) => [id, "none"])) as Rights;
}

export function allWrite(): Rights {
  return Object.fromEntries(MODULE_IDS.map((id) => [id, "write"])) as Rights;
}
