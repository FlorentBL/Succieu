import { NextResponse } from "next/server";
import { handle } from "@/lib/auth/http";
import { makeCsv } from "@/lib/salle-des-fetes/logic";
import { queryFrom, reader } from "@/lib/salle-des-fetes/api";
import { listReservations } from "@/lib/salle-des-fetes/store";

export const dynamic = "force-dynamic";

/** Mêmes filtres que la liste ; sans coordonnées ni paiements en lecture seule. */
export const GET = handle(async (req) => {
  const { canWrite } = await reader();
  const items = await listReservations(queryFrom(req), canWrite);
  return new NextResponse(makeCsv(items), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reservations-salle-des-fetes.csv"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
