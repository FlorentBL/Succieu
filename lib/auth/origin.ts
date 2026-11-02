import { AppError } from "../content/errors";

/**
 * Requêtes qui écrivent : l'en-tête Origin (ou à défaut Referer) doit désigner
 * l'hôte du site (Host / X-Forwarded-Host) ou une origine de SITE_ORIGINS
 * (liste séparée par des virgules).
 */
export function isSameOrigin(headers: Headers): boolean {
  const origin = headers.get("origin") ?? headers.get("referer");
  if (!origin) return false;
  let host: string;
  let full: string;
  try {
    const u = new URL(origin);
    host = u.host;
    full = u.origin;
  } catch {
    return false;
  }
  const allowed = (process.env.SITE_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowed.includes(full)) return true;
  const own = headers.get("x-forwarded-host")?.split(",")[0].trim() || headers.get("host");
  return !!own && own === host;
}

export function assertSameOrigin(req: Request): void {
  if (!isSameOrigin(req.headers)) {
    throw new AppError("bad_origin", "Origine de la requête refusée.");
  }
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
