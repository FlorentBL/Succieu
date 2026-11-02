import { handle } from "@/lib/auth/http";
import { logout } from "@/lib/auth/login";

export const POST = handle(async (req) => logout(req, "bureau"));
