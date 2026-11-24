import { AppError } from "../content/errors";
import { clientIp } from "../auth/origin";
import { handle, ok, readJsonBody } from "../auth/http";
import { requireModule } from "../hub/guards";
import type { HubUser } from "../hub/users";
import { acteurDe } from "./store";
import type { Acteur } from "./types";

export type Ctx = { user: HubUser; acteur: Acteur; ip: string };

/**
 * Enveloppe d'une route du module : garde `espace-bureau` au niveau demandé
 * (une écriture exige aussi l'origine), erreurs normalisées, réponse no-store.
 */
export function route<P = Record<string, never>>(
  level: "read" | "write",
  fn: (req: Request, ctx: Ctx, params: P) => Promise<Response | unknown>,
) {
  const h = handle<{ params: Promise<P> }>(async (req, route) => {
    const user = await requireModule("espace-bureau", level, req);
    const out = await fn(req, { user, acteur: acteurDe(user), ip: clientIp(req.headers) }, await route.params);
    return out instanceof Response ? (out as ReturnType<typeof ok>) : ok(out);
  });
  return h;
}

export async function corps(req: Request): Promise<Record<string, unknown>> {
  const b = await readJsonBody(req);
  if (b && typeof b === "object" && !Array.isArray(b)) return b as Record<string, unknown>;
  throw new AppError("invalid_json", "Corps JSON invalide.");
}
