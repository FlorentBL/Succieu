import { requireBureauAccess } from "@/lib/auth/guards";
import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin } from "@/lib/auth/origin";
import { COOKIE_NAMES, cookieOptions, createSessionToken } from "@/lib/auth/session";
import { isBureauMember } from "@/lib/content/bureau";
import { AppError } from "@/lib/content/errors";

/** Étape 2 : le membre connecté par mot de passe choisit (ou change) son nom. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  await requireBureauAccess();
  const body = (await readJsonBody(req)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || !(await isBureauMember(name))) {
    throw new AppError("validation_failed", "Nom inconnu.", { fields: { name: "Choisissez votre nom dans la liste." } });
  }
  const res = ok({ ok: true, name });
  res.cookies.set(COOKIE_NAMES.bureau, createSessionToken("bureau", name), cookieOptions());
  return res;
});
