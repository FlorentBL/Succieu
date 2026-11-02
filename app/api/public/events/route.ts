import { handle, ok } from "@/lib/auth/http";
import { isValidDate } from "@/lib/content/validation";
import { getUpcomingEvents } from "@/lib/content/store";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const from = new URL(req.url).searchParams.get("from");
  return ok({ events: await getUpcomingEvents(from && isValidDate(from) ? from : undefined) });
});
