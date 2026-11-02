import { requireAdmin } from "@/lib/auth/guards";
import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin } from "@/lib/auth/origin";
import { rejectSubmission } from "@/lib/content/store";
import { parseReason } from "@/lib/content/validation";

/** Corps : { reason: string } (obligatoire) */
export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  assertSameOrigin(req);
  await requireAdmin();
  const body = (await readJsonBody(req)) as { reason?: unknown } | null;
  const sub = await rejectSubmission((await ctx.params).id, parseReason(body?.reason));
  return ok({ submission: sub });
});
