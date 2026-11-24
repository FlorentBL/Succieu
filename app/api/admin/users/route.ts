import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin, clientIp } from "@/lib/auth/origin";
import { adminCreateUser, adminListUsers } from "@/lib/hub/admin";
import { requireAdmin } from "@/lib/hub/guards";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  await requireAdmin();
  return ok({ users: await adminListUsers() });
});

/** { displayName, identifier?, role?, rights? } → 201 { user, temporaryPassword } (affiché une seule fois). */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  return ok(await adminCreateUser(admin, await readJsonBody(req), clientIp(req.headers)), { status: 201 });
});
