import { dayNumber, shortMonth } from "@/lib/publicContent";

const TONES = [
  "bg-moss text-white",
  "bg-ciel text-white",
  "bg-tuile text-white",
  "bg-colza text-ink",
] as const;

/** Pastille de date colorée : jour en grand, mois abrégé. */
export function DateBadge({ date, tone = 0 }: { date: string; tone?: number }) {
  return (
    <div
      aria-hidden
      className={`flex h-[4.5rem] w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl ${TONES[tone % TONES.length]}`}
    >
      <span className="font-display text-3xl font-bold leading-none">{dayNumber(date)}</span>
      <span className="mt-1 text-sm font-semibold leading-none">{shortMonth(date)}</span>
    </div>
  );
}
