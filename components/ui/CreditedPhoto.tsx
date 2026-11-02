import Image from "next/image";
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
        <span className="text-ink-subtle">
          {photo.author ? "Photo " : null}
          <a href={photo.sourceUrl} rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
            {photo.author ?? "Wikimedia Commons"}
          </a>
          ,{" "}
          {photo.licenseUrl ? (
            <a href={photo.licenseUrl} rel="noopener noreferrer license" className="underline underline-offset-2 hover:text-ink">
              {photo.license}
            </a>
          ) : (
            photo.license
          )}
          .
        </span>
      </figcaption>
    </figure>
  );
}
