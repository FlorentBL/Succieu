"use client";

import { useEffect, useState } from "react";
import { focusRing } from "@/components/bureau/fields";
import {
  TEXT_SIZES,
  TEXT_SIZE_EVENT,
  applyTextSize,
  readTextSize,
  saveTextSize,
  type TextSizeId,
} from "./sizeStore";

/** Applique la taille mémorisée à l'arrivée et la rend au site public en quittant l'espace. */
export function TextSizeApplier() {
  useEffect(() => {
    applyTextSize(readTextSize());
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, []);
  return null;
}

/** Choix Petit / Normal / Grand, cibles de 44 px minimum. */
export function TextSizeControl({ className = "" }: { className?: string }) {
  const [size, setSize] = useState<TextSizeId>("normal");

  useEffect(() => {
    const sync = () => setSize(readTextSize());
    sync();
    window.addEventListener(TEXT_SIZE_EVENT, sync);
    return () => window.removeEventListener(TEXT_SIZE_EVENT, sync);
  }, []);

  return (
    <div role="group" aria-label="Taille du texte" className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-sm font-semibold text-ink-muted" aria-hidden>
        Texte
      </span>
      <div className="inline-flex overflow-hidden rounded-full border border-ink-subtle/50 bg-surface">
        {TEXT_SIZES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => saveTextSize(s.id)}
            aria-pressed={size === s.id}
            aria-label={`Texte ${s.label.toLowerCase()}`}
            className={`min-h-11 min-w-11 px-3 text-sm font-semibold transition-colors ${focusRing} ${
              size === s.id ? "bg-moss-dark text-white" : "text-ink hover:bg-pre-pale"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
