import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin, clientIp } from "@/lib/auth/origin";
import { adminApplyGroupTemplate } from "@/lib/hub/groups";
import { requireAdmin } from "@/lib/hub/guards";

export const dynamic = "force-dynamic";

/** { category } → pose le modèle sur les comptes de la catégorie (hors admins) → { category, changed, unchanged }. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  return ok(await adminApplyGroupTemplate(admin, await readJsonBody(req), clientIp(req.headers)));
});
