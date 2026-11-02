import { articleImageUrl } from "@/lib/publicContent";

const TONES = ["bg-moss", "bg-ciel", "bg-tuile", "bg-colza"] as const;

/** Image de l'actualité, sinon aplat de couleur (teinte stable selon l'identifiant). */
export function ArticleVisual({
  id,
  image,
  alt = "",
  className = "",
}: {
  id: string;
  image?: string;
  alt?: string;
  className?: string;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- servie par l'API uploads, hors optimiseur
      <img src={articleImageUrl(image)} alt={alt} loading="lazy" className={`object-cover ${className}`} />
    );
  }
  const tone = TONES[parseInt(id.slice(-2), 16) % TONES.length];
  return <div aria-hidden className={`${tone} ${className}`} />;
}
