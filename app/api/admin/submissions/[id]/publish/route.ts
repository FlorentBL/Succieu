import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { handle, ok, readJsonBody } from "@/lib/auth/http";
import { assertSameOrigin } from "@/lib/auth/origin";
import { publishSubmission } from "@/lib/content/store";
import type { PublishedVersion } from "@/lib/content/types";

/** Corps : { version: "original" | "corrected" } */
export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  assertSameOrigin(req);
  await requireAdmin();
  const body = (await readJsonBody(req)) as { version?: unknown } | null;
  const sub = await publishSubmission((await ctx.params).id, body?.version as PublishedVersion);
  revalidatePath("/", "layout");
  return ok({ submission: sub });
});
