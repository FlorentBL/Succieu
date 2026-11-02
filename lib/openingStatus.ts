import { siteConfig } from "@/lib/site";

export type OpeningStatus = {
  /** Jour courant (heure de Paris), ex. « Mardi » */
  today: string;
  /** Plage du jour (« 08:00 – 12:00 ») ou null si fermé */
  todayHours: string | null;
  /** « open » pendant la plage, « later » avant, « closed » après ou jour fermé */
  state: "open" | "later" | "closed";
  /** Prochain jour d’ouverture si la mairie est fermée pour la journée */
  next: { day: string; hours: string } | null;
};

const rows = siteConfig.mairieOpeningHours;

function parseRange(hours: string): [number, number] | null {
  const m = hours.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return [Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])];
}

/** Calcule l’état d’ouverture de la mairie à l’instant donné, à l’heure de Paris. */
export function getOpeningStatus(now: Date = new Date()): OpeningStatus {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const minutes =
    Number(parts.find((p) => p.type === "hour")?.value ?? 0) * 60 +
    Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  const index = Math.max(
    0,
    rows.findIndex((r) => r.day.toLowerCase() === weekday.toLowerCase()),
  );
  const row = rows[index];
  const range = parseRange(row.hours);

  let state: OpeningStatus["state"] = "closed";
  if (range) {
    if (minutes < range[0]) state = "later";
    else if (minutes < range[1]) state = "open";
  }

  let next: OpeningStatus["next"] = null;
  if (state === "closed") {
    for (let i = 1; i <= 7; i++) {
      const r = rows[(index + i) % rows.length];
      if (parseRange(r.hours)) {
        next = { day: r.day, hours: r.hours };
        break;
      }
    }
  }

  return {
    today: row.day,
    todayHours: range ? row.hours : null,
    state,
    next,
  };
}
