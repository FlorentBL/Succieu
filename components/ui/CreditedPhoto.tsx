import Image from "next/image";
import { PhotoCredit } from "@/components/ui/PhotoCredit";
import type { CommunePhoto } from "@/lib/communePhotos";

/** Photo de la commune avec légende et crédit (auteur, licence, source). */
export function CreditedPhoto({
  photo,
  sizes = "(min-width: 768px) 42rem, 100vw",
  priority = false,
  className = "",
  rounded = "rounded-[1.25rem]",
}: {
  photo: CommunePhoto;
  sizes?: string;
  priority?: boolean;
  className?: string;
  rounded?: string;
}) {
  return (
    <figure className={className}>
      <Image
        src={photo.src}
        width={photo.width}
        height={photo.height}
        alt={photo.alt}
        sizes={sizes}
        priority={priority}
        className={`h-auto w-full ${rounded} bg-pre-pale object-cover`}
      />
      <figcaption className="mt-2 text-sm leading-snug text-ink-muted">
        {photo.caption}.{" "}
        <PhotoCredit photo={photo} className="text-ink-subtle" />.
      </figcaption>
    </figure>
  );
}
