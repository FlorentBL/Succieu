import { requireAdmin } from "@/lib/auth/guards";
import { handle, ok } from "@/lib/auth/http";
import { AppError } from "@/lib/content/errors";
import { listSubmissions } from "@/lib/content/store";
import type { SubmissionStatus } from "@/lib/content/types";

export const dynamic = "force-dynamic";

const STATUSES: SubmissionStatus[] = ["submitted", "reviewed", "published", "rejected"];

/** ?status=submitted,reviewed (défaut : en attente = submitted + reviewed). */
export const GET = handle(async (req) => {
  await requireAdmin();
  const param = new URL(req.url).searchParams.get("status");
  const status = param ? (param.split(",") as SubmissionStatus[]) : (["submitted", "reviewed"] as SubmissionStatus[]);
  if (!status.every((s) => STATUSES.includes(s))) {
    throw new AppError("validation_failed", "Statut inconnu.", { fields: { status: "Statut invalide." } });
  }
  return ok({ submissions: await listSubmissions({ status }) });
});
