import type { Metadata } from "next";
import Link from "next/link";
import { DateBadge } from "@/components/news/DateBadge";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { formatDayLong, getPastEvents } from "@/lib/publicContent";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Rendez-vous passés",
  description: "Les rendez-vous passés à Succieu.",
  alternates: { canonical: "/agenda/passes" },
};

export default async function PastAgendaPage() {
  const items = await getPastEvents();
  return (
    <div>
      <PageHero compact title="Rendez-vous passés" />
      <PageShell className="pb-16 pt-8 sm:pb-20">
        <p>
          <Link href="/agenda" className="inline-flex min-h-11 items-center font-semibold text-moss-dark underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            ← Retour à l’agenda
          </Link>
        </p>
        {items.length === 0 ? (
          <p className="mt-4 text-lg text-ink-muted">Aucun rendez-vous passé.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {items.map((it, i) => (
              <li key={it.id} className="flex gap-4 rounded-[1.5rem] bg-pre-pale p-4 sm:p-5">
                <DateBadge date={it.date} tone={i} />
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-bold text-ink">{it.title}</h2>
                  <p className="mt-1 text-ink-muted first-letter:uppercase">
                    {formatDayLong(it.date)} {it.date.slice(0, 4)}
                    {it.time ? ` · ${it.time}` : ""}
                  </p>
                  {it.place ? <p className="mt-1 text-ink-muted">{it.place}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageShell>
    </div>
  );
}
