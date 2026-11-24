import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin, clientIp } from "@/lib/auth/origin";
import { adminDriveAttach } from "@/lib/hub/admin";
import { requireAdmin } from "@/lib/hub/guards";

/** { userId, driveLogin } : rattache un compte du hub à un compte drive existant (aucune écriture sur le drive). */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  return ok({ user: await adminDriveAttach(admin, await readJsonBody(req), clientIp(req.headers)) });
});
