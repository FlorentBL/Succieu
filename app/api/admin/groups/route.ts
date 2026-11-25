import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin, clientIp } from "@/lib/auth/origin";
import { adminReadGroups, adminSetGroupTemplate } from "@/lib/hub/groups";
import { requireAdmin } from "@/lib/hub/guards";

export const dynamic = "force-dynamic";

/** → { templates: { bureau, conseil, secretariat }, saved: [catégories dont le modèle est enregistré] }. */
export const GET = handle(async () => ok(await adminReadGroups(await requireAdmin())));

/** { category, rights } → modèle enregistré (n'agit sur aucun compte). */
export const PUT = handle(async (req) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  return ok(await adminSetGroupTemplate(admin, await readJsonBody(req), clientIp(req.headers)));
});
