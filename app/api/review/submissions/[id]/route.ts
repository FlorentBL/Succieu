import { requireReviewToken } from "@/lib/auth/guards";
import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { getSubmission, submitReview } from "@/lib/content/store";
import { parseReview } from "@/lib/content/validation";

export const dynamic = "force-dynamic";

export const GET = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  requireReviewToken(req);
  return ok({ submission: await getSubmission((await ctx.params).id) });
});

/** Corps : { ok, issues[], corrected: {...champs}, summary } -> statut "reviewed". */
export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  requireReviewToken(req);
  const { id } = await ctx.params;
  const current = await getSubmission(id);
  const review = parseReview(current.kind, await readJsonBody(req));
  return ok({ submission: await submitReview(id, review) });
});
