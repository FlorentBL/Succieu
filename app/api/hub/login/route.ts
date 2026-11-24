import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { hubLogin, sessionBody } from "@/lib/hub/auth";
import { HUB_COOKIE, hubCookieOptions } from "@/lib/hub/session";

export const POST = handle(async (req) => {
  const body = (await readJsonBody(req)) as { identifier?: unknown; password?: unknown } | null;
  const { user, token } = await hubLogin(req, body?.identifier, body?.password);
  const res = ok(sessionBody(user));
  res.cookies.set(HUB_COOKIE, token, hubCookieOptions());
  return res;
});
