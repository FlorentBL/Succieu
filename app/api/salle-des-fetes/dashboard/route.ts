import { handle, ok } from "@/lib/auth/http";
import { reader } from "@/lib/salle-des-fetes/api";
import { getDashboard } from "@/lib/salle-des-fetes/store";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const { canWrite } = await reader();
  return ok(await getDashboard(canWrite));
});
