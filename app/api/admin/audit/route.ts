import { handle, ok } from "@/lib/auth/http";
import { adminReadAudit } from "@/lib/hub/admin";
import { requireAdmin } from "@/lib/hub/guards";

export const dynamic = "force-dynamic";

/** ?person=<identifiant>&limit=<1..500> → { entries } (plus récentes d'abord). */
export const GET = handle(async (req) => {
  const admin = await requireAdmin();
  const q = new URL(req.url).searchParams;
  const limit = q.get("limit") ? Number(q.get("limit")) : undefined;
  return ok({ entries: await adminReadAudit(admin, q.get("person") || undefined, Number.isFinite(limit) ? limit : undefined) });
});
