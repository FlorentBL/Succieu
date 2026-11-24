"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Boîte de dialogue native (<dialog>) : focus piégé, Échap et clic sur le fond ferment. */
export function Modal({ labelledBy, onClose, children }: { labelledBy: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(46rem,calc(100vw-1rem))] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-[1.25rem] border border-border-subtle bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/50"
    >
      <div className="p-5 sm:p-7">{children}</div>
    </dialog>
  );
}

export function ModalHeader({ id, kicker, title, onClose }: { id: string; kicker: string; title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{kicker}</p>
        <h2 id={id} className="font-display text-2xl font-bold">
          {title}
        </h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ink-subtle/50 text-2xl leading-none hover:bg-pre-pale focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
      >
        ×
      </button>
    </div>
  );
}
