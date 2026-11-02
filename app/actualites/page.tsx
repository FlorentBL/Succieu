import type { Metadata } from "next";
import Link from "next/link";
import { ArticleVisual } from "@/components/news/ArticleVisual";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { getPublishedArticles } from "@/lib/content/store";
import { formatDate } from "@/lib/publicContent";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Actualités",
  description: "Les actualités de la commune de Succieu : informations de la mairie et vie du village.",
  alternates: { canonical: "/actualites" },
};

export default async function ActualitesPage() {
  const articles = await getPublishedArticles();
  return (
    <div>
      <PageHero compact title="Actualités" description="Les informations de la mairie et la vie du village, des plus récentes aux plus anciennes." />
      <PageShell className="pb-16 pt-8 sm:pb-20">
        {articles.length === 0 ? (
          <p className="text-lg text-ink-muted">Aucune actualité publiée pour le moment.</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <li key={a.id} className="group relative overflow-hidden rounded-[1.5rem] bg-pre-pale">
                <ArticleVisual id={a.id} image={a.fields.image} className="aspect-[16/9] w-full" />
                <div className="p-5">
                  <p className="text-sm font-semibold text-ink-muted">
                    <time dateTime={a.publishedAt}>{formatDate(a.publishedAt)}</time>
                  </p>
                  <h2 className="font-display mt-2 text-xl font-bold leading-snug text-ink">
                    <Link
                      href={`/actualites/${a.id}`}
                      className="after:absolute after:inset-0 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {a.fields.title}
                    </Link>
                  </h2>
                  <p className="mt-2 text-[1.0625rem] leading-relaxed text-ink-muted">{a.fields.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageShell>
    </div>
  );
}
