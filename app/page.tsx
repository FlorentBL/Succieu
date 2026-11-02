import type { Metadata } from "next";
import { HomePage, heroImageSrc } from "@/components/home/HomePage";
import { getAgenda, getHomeSpotlight } from "@/lib/publicContent";
import { siteConfig } from "@/lib/site";

/** Repli : la modération revalide déjà la page, ceci borne le retard à une minute. */
export const revalidate = 60;

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

export default async function Page() {
  const [spotlight, agenda] = await Promise.all([getHomeSpotlight(), getAgenda()]);
  return <HomePage spotlight={spotlight} agenda={agenda} />;
}
