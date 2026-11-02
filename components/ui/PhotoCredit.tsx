import type { CommunePhoto } from "@/lib/communePhotos";

/** Ligne de crédit (auteur, licence, source) exigée par les licences libres. */
export function PhotoCredit({ photo, className = "" }: { photo: CommunePhoto; className?: string }) {
  const link = "underline underline-offset-2 hover:opacity-100";
  return (
    <span className={className}>
      {photo.author ? "Photo " : null}
      <a href={photo.sourceUrl} rel="noopener noreferrer" className={link}>
        {photo.author ?? "Wikimedia Commons"}
      </a>
      {photo.modified ? " (retouchée)" : null},{" "}
      {photo.licenseUrl ? (
        <a href={photo.licenseUrl} rel="noopener noreferrer license" className={link}>
          {photo.license}
        </a>
      ) : (
        photo.license
      )}
    </span>
  );
}
