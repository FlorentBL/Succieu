import { handle, ok } from "@/lib/auth/http";
import { adminDriveCompare } from "@/lib/hub/admin";
import { requireAdmin } from "@/lib/hub/guards";

export const dynamic = "force-dynamic";

/** Comparaison hub ↔ drive en lecture seule : { enabled, rows }. `enabled: false` sans variables DRIVE_*. */
export const GET = handle(async () => ok(await adminDriveCompare(await requireAdmin())));
