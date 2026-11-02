import { handle, ok } from "@/lib/auth/http";
import { getBureauNames } from "@/lib/content/bureau";

export const dynamic = "force-dynamic";

export const GET = handle(async () => ok({ names: await getBureauNames() }));
