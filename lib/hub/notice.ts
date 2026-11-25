/** Message d'avis affiché après une action : seule une chaîne non vide est acceptée (jamais un objet, React #31). */
export function noticeText(msg: unknown, fallback: string): string {
  return typeof msg === "string" && msg ? msg : fallback;
}
