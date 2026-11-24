import { assertSameOrigin } from "../auth/origin";
import { readJsonBody } from "../auth/http";
import { requireModule } from "../hub/guards";
import { hasAccess, type HubUser } from "../hub/users";
import type { Query } from "./logic";

export const MODULE = "salle-des-fetes" as const;

export async function reader(): Promise<{ user: HubUser; canWrite: boolean }> {
  const user = await requireModule(MODULE, "read");
  return { user, canWrite: hasAccess(user, MODULE, "write") };
}

export async function writer(req: Request): Promise<HubUser> {
  assertSameOrigin(req);
  return requireModule(MODULE, "write", req);
}

export const actorName = (u: HubUser) => u.displayName;

export function queryFrom(req: Request): Query {
  const p = new URL(req.url).searchParams;
  const g = (k: string) => p.get(k) ?? undefined;
  return { month: g("month"), from: g("from"), to: g("to"), q: g("q"), room: g("room"), status: g("status") };
}

export { readJsonBody };
