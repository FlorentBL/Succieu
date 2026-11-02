import { handle, readJsonBody } from "@/lib/auth/http";
import { login } from "@/lib/auth/login";

export const POST = handle(async (req) => {
  const body = (await readJsonBody(req)) as { password?: unknown } | null;
  return login(req, "admin", "admin", body?.password, "ADMIN_PASSWORD_HASH");
});
