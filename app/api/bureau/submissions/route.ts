import { requireBureau } from "@/lib/auth/guards";
import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin } from "@/lib/auth/origin";
import { AppError } from "@/lib/content/errors";
import { createSubmission, listSubmissions } from "@/lib/content/store";
import { parseKind } from "@/lib/content/validation";

export const dynamic = "force-dynamic";

/** Historique de l'auteur connecté : toutes ses saisies (statut, avis, motif). */
export const GET = handle(async () => {
  const s = await requireBureau();
  return ok({ submissions: await listSubmissions({ author: s.name }) });
});

/** Corps : { kind: "article" | "event", fields: {...} } */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  const s = await requireBureau();
  const body = (await readJsonBody(req)) as { kind?: unknown; fields?: unknown } | null;
  if (!body || typeof body !== "object") throw new AppError("validation_failed", "Objet attendu.");
  const sub = await createSubmission(s.name, parseKind(body.kind), body.fields);
  return ok({ submission: sub }, { status: 201 });
});
