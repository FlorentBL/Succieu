import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin, clientIp } from "@/lib/auth/origin";
import { adminUpdateUser } from "@/lib/hub/admin";
import { requireAdmin } from "@/lib/hub/guards";

/** { role?, rights?, displayName? } — enregistrement explicite, journalisé. */
export const PATCH = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const user = await adminUpdateUser(admin, (await ctx.params).id, await readJsonBody(req), clientIp(req.headers));
  return ok({ user });
});
