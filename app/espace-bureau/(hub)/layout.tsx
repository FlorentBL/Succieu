import { HubNav, type NavItem } from "@/components/hub/HubNav";
import { allowedModules, requireHubPageUser } from "@/lib/hub/page-guards";
import { isModerator } from "@/lib/hub/users";

/**
 * Coquille commune du hub (hors connexion, changement imposé, modération et actualités historiques) :
 * session exigée, navigation générée depuis lib/hub/modules.ts.
 * Chaque page de module doit en plus appeler requireModulePage(id).
 */
export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const user = await requireHubPageUser();
  const items: NavItem[] = [
    { href: "/espace-bureau", label: "Accueil" },
    ...allowedModules(user).map((m) => ({ href: m.path, label: m.label, level: m.level })),
    ...(isModerator(user) ? [{ href: "/espace-bureau/moderation", label: "Modération" }] : []),
    ...(user.role === "admin" ? [{ href: "/espace-bureau/administration", label: "Administration" }] : []),
    { href: "/espace-bureau/compte", label: "Mon compte" },
  ];
  return (
    <>
      <HubNav items={items} displayName={user.displayName} />
      {children}
    </>
  );
}
