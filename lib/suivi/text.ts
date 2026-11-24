export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

/** Texte multi-lignes : espaces nettoyés, retours à la ligne conservés. */
export function cleanMultiline(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeText(value: unknown): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

export function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

const MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];

function validIso(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return dt.toISOString().slice(0, 10);
}

/**
 * Renvoie une date ISO uniquement si le texte désigne un jour précis et sans ambiguïté
 * (AAAA-MM-JJ, JJ/MM/AAAA, « 15 décembre 2026 »). « Avril 2027 », « 2027 », « ASAP »… → null.
 */
export function extractCertainDate(text: string): string | null {
  const t = normalizeText(text);
  let m = /^(\d{4}) (\d{1,2}) (\d{1,2})$/.exec(t);
  if (m) return validIso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2}) (\d{1,2}) (\d{4})$/.exec(t);
  if (m) return validIso(+m[3], +m[2], +m[1]);
  m = /^(?:le )?(\d{1,2})(?:er)? ([a-z]+) (\d{4})$/.exec(t);
  if (m) {
    const mi = MOIS.indexOf(m[2]);
    if (mi >= 0) return validIso(+m[3], mi + 1, +m[1]);
  }
  return null;
}

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function formatDateFr(iso: string): string {
  return ISO_DATE.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : iso;
}
