import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/espace-bureau", "/api/"],
    },
    sitemap: "https://www.succieu.fr/sitemap.xml",
  };
}
