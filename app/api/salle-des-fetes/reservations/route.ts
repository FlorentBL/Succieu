import { handle, ok } from "@/lib/auth/http";
import { actorName, queryFrom, reader, readJsonBody, writer } from "@/lib/salle-des-fetes/api";
import { createReservation, listReservations } from "@/lib/salle-des-fetes/store";

export const dynamic = "force-dynamic";

/** Lecture : sans coordonnées ni paiements. ?month=AAAA-MM&q=&status=&room= */
export const GET = handle(async (req) => {
  const { canWrite } = await reader();
  const reservations = await listReservations(queryFrom(req), canWrite);
  return ok({ reservations, total: reservations.length });
});

export const POST = handle(async (req) => {
  const user = await writer(req);
  return ok({ reservation: await createReservation(await readJsonBody(req), actorName(user)) }, { status: 201 });
});
