import { getBureauSession } from "@/lib/auth/guards";
import { handle, ok } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const s = await getBureauSession();
  return ok(s ? { authenticated: true, name: s.name } : { authenticated: false });
});
