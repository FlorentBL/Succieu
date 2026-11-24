import { handle, ok } from "@/lib/auth/http";
import { assertSameOrigin } from "@/lib/auth/origin";
import { HUB_COOKIE, hubCookieOptions } from "@/lib/hub/session";

export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const res = ok({ ok: true });
  res.cookies.set(HUB_COOKIE, "", hubCookieOptions(0));
  return res;
});
