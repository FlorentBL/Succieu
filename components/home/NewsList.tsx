import Image from "next/image";
import Link from "next/link";
import { IconArrowRight } from "@/components/icons/UiIcons";
import type { HomeSpotlightItem } from "@/lib/homeSpotlight";

/**
 * Fil « À la une ». Prévu pour recevoir plus tard des actualités gérées :
 * la première entrée est mise en avant, les suivantes forment une liste.
 * Sans image, l’entrée prend un aplat de couleur avec l’étourneau.
 */
export function NewsList({ items }: { items: HomeSpotlightItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-[1.25rem] bg-pre-pale p-6 text-ink-muted">
        Aucune actualité pour le moment.
      </p>
    );
  }
  const [first, ...rest] = items;

  return (
    <div className="space-y-4">
      <article
        className={`relative overflow-hidden rounded-[1.5rem] ${
          first.alert ? "bg-tuile text-white" : "bg-moss text-white"
        }`}
      >
        {first.image ? (
          <div className="relative aspect-[16/7]">
            <Image src={first.image} alt="" fill className="object-cover" sizes="(min-width: 1024px) 50vw, 100vw" />
          </div>
        ) : (
          <span
            className="etourneau pointer-events-none absolute -bottom-6 right-4 w-32 text-white/15 sm:w-40"
            aria-hidden
          />
        )}
        <div className="relative p-6 sm:p-8">
          {first.meta ? (
            <p className="text-sm font-semibold text-white/85">{first.meta}</p>
          ) : null}
          <h3 className="font-display mt-2 max-w-md text-2xl font-bold leading-tight sm:text-[1.75rem]">
            {first.title}
          </h3>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-white/90">
            {first.body}
          </p>
          <Link
            href={first.href}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-ink transition hover:bg-colza focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {first.cta} <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>

      {rest.length > 0 ? (
        <ul className="divide-y divide-border-subtle rounded-[1.5rem] border border-border-subtle bg-surface">
          {rest.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-start gap-4 p-5 transition hover:bg-pre-pale/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus)] sm:p-6"
              >
                <span
                  className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${
                    item.alert ? "bg-tuile" : "bg-moss"
                  }`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  {item.meta ? (
                    <span className="block text-sm font-semibold text-ink-subtle">
                      {item.meta}
                    </span>
                  ) : null}
                  <span className="font-display mt-0.5 block text-xl font-bold leading-snug text-ink">
                    {item.title}
                  </span>
                  <span className="mt-1.5 block text-[0.95rem] leading-relaxed text-ink-muted">
                    {item.body}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-moss-dark">
                    {item.cta}
                    <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
