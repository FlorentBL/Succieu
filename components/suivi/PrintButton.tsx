"use client";

import { btnPrimary } from "./ui";

export function PrintButton() {
  return (
    <button type="button" className={btnPrimary} onClick={() => window.print()}>
      Imprimer
    </button>
  );
}
