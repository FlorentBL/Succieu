import { getAdminSession } from "@/lib/auth/guards";
import { handle, ok } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

export const GET = handle(async () => ok({ authenticated: !!(await getAdminSession()) }));
