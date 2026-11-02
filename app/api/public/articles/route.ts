import { handle, ok } from "@/lib/auth/http";
import { getPublishedArticles } from "@/lib/content/store";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const n = Number(new URL(req.url).searchParams.get("limit"));
  return ok({ articles: await getPublishedArticles(Number.isInteger(n) && n > 0 ? Math.min(n, 50) : undefined) });
});
