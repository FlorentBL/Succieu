import { requireModule } from "@/lib/hub/guards";
import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { AppError } from "@/lib/content/errors";
import { createSubmission, listSubmissions } from "@/lib/content/store";
import { parseKind } from "@/lib/content/validation";

export const dynamic = "force-dynamic";

/** Historique de l'auteur connecté : toutes ses saisies (statut, avis, motif). */
export const GET = handle(async () => {
  const u = await requireModule("actus-agenda", "read");
  return ok({ submissions: await listSubmissions({ author: u.displayName }) });
});

/** Corps : { kind: "article" | "event", fields: {...} } */
export const POST = handle(async (req) => {
  const u = await requireModule("actus-agenda", "write", req);
  const body = (await readJsonBody(req)) as { kind?: unknown; fields?: unknown } | null;
  if (!body || typeof body !== "object") throw new AppError("validation_failed", "Objet attendu.");
  const sub = await createSubmission(u.displayName, parseKind(body.kind), body.fields);
  return ok({ submission: sub }, { status: 201 });
});
