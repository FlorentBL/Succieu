import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { hubChangePassword, sessionBody } from "@/lib/hub/auth";
import { requireUser } from "@/lib/hub/guards";
import { HUB_COOKIE, hubCookieOptions } from "@/lib/hub/session";

export const POST = handle(async (req) => {
  const user = await requireUser({ allowPasswordChange: true });
  const { user: updated, token } = await hubChangePassword(req, user, await readJsonBody(req));
  const res = ok(sessionBody(updated));
  res.cookies.set(HUB_COOKIE, token, hubCookieOptions());
  return res;
});
