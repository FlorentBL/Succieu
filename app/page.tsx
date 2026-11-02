import type { Metadata } from "next";
import { HomePage, heroImageSrc } from "@/components/home/HomePage";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  /** Titre d’onglet court (sans répéter « — Succieu » du template du layout) */
  title: { absolute: siteConfig.shortName },
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [
      {
        url: heroImageSrc,
        alt: "Vue aérienne du village de Succieu",
      },
    ],
  },
};

export default function Page() {
  return <HomePage />;
}
