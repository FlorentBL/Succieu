import { handle, readJsonBody } from "@/lib/auth/http";
import { login } from "@/lib/auth/login";
import { isBureauMember } from "@/lib/content/bureau";
import { AppError } from "@/lib/content/errors";

export const POST = handle(async (req) => {
  const body = (await readJsonBody(req)) as { name?: unknown; password?: unknown } | null;
  if (!body || typeof body.name !== "string") {
    throw new AppError("validation_failed", "Nom requis.", { fields: { name: "Nom : champ obligatoire." } });
  }
  const name = body.name.trim();
  return login(req, "bureau", name, body.password, "BUREAU_PASSWORD_HASH", await isBureauMember(name));
});
