import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin, clientIp } from "@/lib/auth/origin";
import { adminSetActive } from "@/lib/hub/admin";
import { requireAdmin } from "@/lib/hub/guards";

/** { active: boolean } */
export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const body = (await readJsonBody(req)) as { active?: unknown } | null;
  const user = await adminSetActive(admin, (await ctx.params).id, body?.active, clientIp(req.headers));
  return ok({ user });
});
