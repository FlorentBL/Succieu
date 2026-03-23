import type { MetadataRoute } from "next";

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
  "/participation",
  "/associations",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return paths.map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
