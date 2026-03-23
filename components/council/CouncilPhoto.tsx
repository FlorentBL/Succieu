"use client";

import { useCallback, useState } from "react";

type Props = {
  /** Nom exact du fichier dans `public/photos/` */
  photoFile: string;
  name: string;
  className?: string;
  priority?: boolean;
};

function photoUrl(photoFile: string): string {
  const safe = photoFile.replace(/\\/g, "").replace(/^\/+/, "");
  return `/photos/${encodeURIComponent(safe)}`;
}

/**
 * Balise `img` native (pas `next/image`) : les noms de fichiers ont des espaces
 * et casse variables ; une seule requête par portrait, pas d’essais d’extensions.
 */
export function CouncilPhoto({
  photoFile,
  name,
  className = "",
  priority = false,
}: Props) {
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(() => {
    setFailed(true);
  }, []);

  if (failed) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
    return (
      <div
        className={`flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-br from-stone-200/90 to-stone-300/80 text-ink/45 ${className}`}
        role="img"
        aria-label={`Photo non disponible — ${name}`}
      >
        <span className="font-display text-2xl font-semibold tracking-wide sm:text-3xl">
          {initials || "?"}
        </span>
      </div>
    );
  }

  const src = photoUrl(photoFile);

  return (
    <div
      className={`relative aspect-[3/4] w-full overflow-hidden bg-stone-200/60 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Portrait de ${name}`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.02]"
        onError={handleError}
      />
    </div>
  );
}
