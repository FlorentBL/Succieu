import { requireBureauAccess } from "@/lib/auth/guards";
import { handle, ok } from "@/lib/auth/http";
import { getBureauNames } from "@/lib/content/bureau";

export const dynamic = "force-dynamic";

/** Liste des noms, visible seulement après le mot de passe du bureau. */
export const GET = handle(async () => {
  await requireBureauAccess();
  return ok({ names: await getBureauNames() });
});
