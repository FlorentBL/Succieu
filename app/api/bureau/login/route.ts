import { handle, readJsonBody } from "@/lib/auth/http";
import { login } from "@/lib/auth/login";

/** Étape 1 : mot de passe commun seul. Le nom est choisi ensuite (POST /api/bureau/identity). */
export const POST = handle(async (req) => {
  const body = (await readJsonBody(req)) as { password?: unknown } | null;
  return login(req, "bureau", "", body?.password, "BUREAU_PASSWORD_HASH");
});
