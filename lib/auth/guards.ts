import { timingSafeEqual } from "node:crypto";
import { AppError } from "../content/errors";

/**
 * Authorization: Bearer <REVIEW_API_TOKEN> pour l'agent de relecture.
 * Les sessions humaines (bureau, admin) relèvent du hub : lib/hub/guards.ts.
 */
export function requireReviewToken(req: Request): void {
  const expected = process.env.REVIEW_API_TOKEN;
  if (!expected || expected.length < 24) {
    throw new AppError("server_misconfigured", "REVIEW_API_TOKEN absent ou trop court.");
  }
  const m = /^Bearer (.+)$/.exec(req.headers.get("authorization") ?? "");
  const given = Buffer.from(m?.[1] ?? "");
  const exp = Buffer.from(expected);
  if (given.length !== exp.length || !timingSafeEqual(given, exp)) {
    throw new AppError("unauthorized", "Jeton de relecture invalide.");
  }
}
