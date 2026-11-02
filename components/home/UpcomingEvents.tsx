import Link from "next/link";
import { DateBadge } from "@/components/news/DateBadge";
import { PageShell } from "@/components/ui/PageShell";
import { IconArrowRight, IconPin } from "@/components/icons/UiIcons";
import { formatDayLong, type AgendaItem } from "@/lib/publicContent";

/** Bande « À l’agenda » de l'accueil (3 à 4 pastilles). */
export function UpcomingEvents({ items }: { items: AgendaItem[] }) {
  const shown = items.slice(0, 4);
  return (
    <section aria-labelledby="accueil-agenda" className="mt-14 sm:mt-16">
      <PageShell>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id="accueil-agenda" className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            À l’agenda
          </h2>
          <Link
            href="/agenda"
            className="inline-flex min-h-11 items-center gap-2 rounded-full font-semibold text-moss-dark underline decoration-moss/40 underline-offset-4 hover:decoration-moss focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Tout l’agenda <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((it, i) => (
            <li
              key={it.id}
              className="flex gap-4 rounded-[1.5rem] bg-pre-pale p-4 sm:p-5"
            >
              <DateBadge date={it.date} tone={it.market ? 3 : i} />
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold leading-snug text-ink">{it.title}</h3>
                <p className="mt-1 text-[0.9375rem] text-ink-muted first-letter:uppercase">
                  {formatDayLong(it.date)}
                </p>
                {it.time ? <p className="text-[0.9375rem] font-semibold text-ink">{it.time}</p> : null}
                {it.place ? (
                  <p className="mt-1 flex gap-1.5 text-[0.9375rem] text-ink-muted">
                    <IconPin className="mt-0.5 h-4 w-4 shrink-0 text-tuile" />
                    <span>{it.place}</span>
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </PageShell>
    </section>
  );
}
