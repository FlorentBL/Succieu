import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleVisual } from "@/components/news/ArticleVisual";
import { IconArrowRight } from "@/components/icons/UiIcons";
import { PageShell } from "@/components/ui/PageShell";
import { getPublishedArticles } from "@/lib/content/store";
import { articleImageUrl, formatDate } from "@/lib/publicContent";

export const revalidate = 60;

async function find(id: string) {
  if (!/^a-[a-f0-9]{16}$/.test(id)) return undefined;
  return (await getPublishedArticles()).find((a) => a.id === id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const a = await find((await params).id);
  if (!a) return { title: "Actualité introuvable", robots: { index: false } };
  return {
    title: a.fields.title,
    description: a.fields.summary,
    alternates: { canonical: `/actualites/${a.id}` },
    openGraph: {
      type: "article",
      title: a.fields.title,
      description: a.fields.summary,
      publishedTime: a.publishedAt,
      images: a.fields.image ? [{ url: articleImageUrl(a.fields.image) }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const a = await find((await params).id);
  if (!a) notFound();
  const { fields } = a;
  const paragraphs = fields.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <article>
      <div className="bg-pre-pale">
        <PageShell width="narrow" className="pb-8 pt-10 sm:pt-14">
          <Link href="/actualites" className="inline-flex min-h-11 items-center font-semibold text-moss-dark underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
            ← Toutes les actualités
          </Link>
          <p className="mt-4 font-semibold text-ink-muted">
            <time dateTime={a.publishedAt}>{formatDate(a.publishedAt)}</time>
          </p>
          <h1 className="font-display mt-2 text-4xl font-bold leading-[1.08] tracking-tight text-moss-dark sm:text-5xl">
            {fields.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted">{fields.summary}</p>
        </PageShell>
      </div>
      <PageShell width="narrow" className="pb-16 pt-8 sm:pb-20">
        {fields.image ? (
          <ArticleVisual id={a.id} image={fields.image} alt="" className="mb-8 max-h-[28rem] w-full rounded-[1.5rem]" />
        ) : null}
        <div className="space-y-4 text-[1.0625rem] leading-[1.75] text-ink">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">{p}</p>
          ))}
        </div>
        {fields.linkUrl ? (
          <Link
            href={fields.linkUrl}
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-moss-dark px-6 py-2.5 font-semibold text-white hover:bg-moss focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {fields.linkLabel || "En savoir plus"} <IconArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </PageShell>
    </article>
  );
}
