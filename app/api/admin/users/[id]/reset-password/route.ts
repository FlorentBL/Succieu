import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin, clientIp } from "@/lib/auth/origin";
import { adminResetPassword } from "@/lib/hub/admin";
import { requireAdmin } from "@/lib/hub/guards";

/** { passwordMode?: "generate"|"custom", password? } → { user, password, drive } (affiché une seule fois, jamais journalisé). */
export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  return ok(await adminResetPassword(admin, (await ctx.params).id, await readJsonBody(req).catch(() => ({})), clientIp(req.headers)));
});
