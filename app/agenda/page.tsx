import type { Metadata } from "next";
import Link from "next/link";
import { DateBadge } from "@/components/news/DateBadge";
import { IconPin } from "@/components/icons/UiIcons";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { formatDayLong, getAgenda, monthKey, monthLabel } from "@/lib/publicContent";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Agenda",
  description: "Les prochains rendez-vous à Succieu : marché, réunions, animations et événements du village.",
  alternates: { canonical: "/agenda" },
};

export default async function AgendaPage() {
  const items = await getAgenda();
  const months: { key: string; label: string; items: typeof items }[] = [];
  for (const it of items) {
    const key = monthKey(it.date);
    let m = months.find((x) => x.key === key);
    if (!m) months.push((m = { key, label: monthLabel(it.date), items: [] }));
    m.items.push(it);
  }
  return (
    <div>
      <PageHero compact title="Agenda" description="Tous les rendez-vous à venir à Succieu. Le marché a lieu chaque samedi matin." />
      <PageShell className="pb-16 pt-8 sm:pb-20">
        {months.map((m) => (
          <section key={m.key} aria-labelledby={`mois-${m.key}`} className="mb-10">
            <h2 id={`mois-${m.key}`} className="font-display text-2xl font-bold capitalize text-ink sm:text-3xl">
              {m.label}
            </h2>
            <ul className="mt-4 space-y-4">
              {m.items.map((it, i) => (
                <li key={it.id} className="flex gap-4 rounded-[1.5rem] bg-pre-pale p-4 sm:gap-5 sm:p-5">
                  <DateBadge date={it.date} tone={it.market ? 3 : i} />
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-bold leading-snug text-ink">{it.title}</h3>
                    <p className="mt-1 text-ink-muted first-letter:uppercase">
                      {formatDayLong(it.date)}
                      {it.time ? ` · ${it.time}` : ""}
                    </p>
                    {it.place ? (
                      <p className="mt-1 flex gap-1.5 text-ink-muted">
                        <IconPin className="mt-1 h-4 w-4 shrink-0 text-tuile" />
                        <span>{it.place}</span>
                      </p>
                    ) : null}
                    {it.description ? (
                      <p className="mt-2 whitespace-pre-line leading-relaxed text-ink">{it.description}</p>
                    ) : null}
                    {it.href ? (
                      <Link href={it.href} className="mt-2 inline-flex min-h-11 items-center font-semibold text-moss-dark underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                        Plus d’informations
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <p>
          <Link href="/agenda/passes" className="inline-flex min-h-11 items-center font-semibold text-moss-dark underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            Voir les rendez-vous passés
          </Link>
        </p>
      </PageShell>
    </div>
  );
}
