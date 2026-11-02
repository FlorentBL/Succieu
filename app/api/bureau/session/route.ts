import { getBureauAccess } from "@/lib/auth/guards";
import { handle, ok } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

/** `name` vaut null tant que le membre n'a pas choisi son nom. */
export const GET = handle(async () => {
  const s = await getBureauAccess();
  return ok(s ? { authenticated: true, name: s.name || null } : { authenticated: false });
});
