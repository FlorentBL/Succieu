import { requireAdmin } from "@/lib/auth/guards";
import { handle, ok } from "@/lib/auth/http";
import { getSubmission } from "@/lib/content/store";

export const dynamic = "force-dynamic";

export const GET = handle<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  await requireAdmin();
  return ok({ submission: await getSubmission((await ctx.params).id) });
});
