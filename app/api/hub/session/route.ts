import { handle, ok } from "@/lib/auth/http";
import { sessionBody } from "@/lib/hub/auth";
import { requireUser } from "@/lib/hub/guards";

export const dynamic = "force-dynamic";

/** Identité, rôle, droits . 401 sans session. */
export const GET = handle(async () => ok(sessionBody(await requireUser())));
