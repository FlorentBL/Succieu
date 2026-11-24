import { handle, ok } from "@/lib/auth/http";
import { requireModule } from "@/lib/hub/guards";
import { MODULE } from "@/lib/salle-des-fetes/api";
import { listAudit } from "@/lib/salle-des-fetes/store";

export const dynamic = "force-dynamic";

/** Journal réservé au droit d'écriture. ?reservationId=&limit= */
export const GET = handle(async (req) => {
  await requireModule(MODULE, "write");
  const p = new URL(req.url).searchParams;
  return ok({ events: await listAudit({ reservationId: p.get("reservationId") || undefined, limit: Number(p.get("limit")) }) });
});
