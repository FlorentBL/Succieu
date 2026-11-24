import { handle, ok } from "@/lib/auth/http";
import { actorName, reader, readJsonBody, writer } from "@/lib/salle-des-fetes/api";
import { cancelReservation, getReservation, updateReservation } from "@/lib/salle-des-fetes/store";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const { canWrite } = await reader();
  return ok({ reservation: await getReservation((await params).id, canWrite) });
});

export const PUT = handle<Ctx>(async (req, { params }) => {
  const user = await writer(req);
  return ok({ reservation: await updateReservation((await params).id, await readJsonBody(req), actorName(user)) });
});

/** Annulation réversible (la réservation reste dans le journal et peut être restaurée). */
export const DELETE = handle<Ctx>(async (req, { params }) => {
  const user = await writer(req);
  return ok({ reservation: await cancelReservation((await params).id, actorName(user)) });
});
