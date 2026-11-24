import { handle, ok } from "@/lib/auth/http";
import { actorName, readJsonBody, writer } from "@/lib/salle-des-fetes/api";
import { restoreReservation } from "@/lib/salle-des-fetes/store";

export const dynamic = "force-dynamic";

/** { status?, revision? } : restauration revalidée (409 si le créneau est repris). */
export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await writer(req);
  const body = (await readJsonBody(req)) as { status?: unknown; revision?: unknown };
  return ok({ reservation: await restoreReservation((await params).id, body?.status, actorName(user), body?.revision) });
});
