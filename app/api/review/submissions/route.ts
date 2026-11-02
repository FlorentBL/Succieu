import { requireReviewToken } from "@/lib/auth/guards";
import { handle, ok } from "@/lib/auth/http";
import { listSubmissions } from "@/lib/content/store";

export const dynamic = "force-dynamic";

/** Saisies au statut "submitted". Authorization: Bearer REVIEW_API_TOKEN. */
export const GET = handle(async (req) => {
  requireReviewToken(req);
  return ok({ submissions: await listSubmissions({ status: "submitted" }) });
});
