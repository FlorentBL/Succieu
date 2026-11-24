/** Adresse du drive (ownCloud Infinite Scale) : https uniquement, repli sur le drive de la commune. */
export const DEFAULT_DRIVE_URL = "https://drive.succieu.fr/";

/** Renvoie l'URL normalisée si elle est en https avec un hôte, sans identifiants intégrés ; sinon null. */
export function parseDriveUrl(raw: string | undefined | null): string | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || !u.hostname || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Lue côté serveur à chaque appel (BUREAU_DRIVE_URL) ; valeur absente ou invalide : repli. */
export function driveUrl(env: Record<string, string | undefined> = process.env): string {
  return parseDriveUrl(env.BUREAU_DRIVE_URL) ?? DEFAULT_DRIVE_URL;
}
