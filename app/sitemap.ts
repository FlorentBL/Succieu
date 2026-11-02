import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/content/store";

export const revalidate = 3600;

const base = "https://www.succieu.fr";

const paths = [
  "/",
  "/contact",
  "/vivre",
  "/demarches",
  "/demarches/administratif",
  "/demarches/urbanisme",
  "/ma-mairie",
  "/ma-mairie/conseil",
  "/ma-mairie/ccas",
  "/ma-mairie/identite",
  "/petite-enfance-ecole",
  "/associations",
  "/actualites",
  "/agenda",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const articles = await getPublishedArticles();
  const pages: MetadataRoute.Sitemap = paths.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
  return [
    ...pages,
    ...articles.map((a) => ({
      url: `${base}/actualites/${a.id}`,
      lastModified: new Date(a.publishedAt),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
