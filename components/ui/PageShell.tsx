import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** default max-w-6xl ; narrow = max-w-3xl (pages texte) */
  width?: "default" | "narrow";
};

/**
 * Conteneur horizontal aligné sur la grille du site (UX : même gouttière partout).
 */
export function PageShell({
  children,
  className = "",
  width = "default",
}: Props) {
  const max =
    width === "narrow" ? "max-w-3xl" : "max-w-6xl";
  return (
    <div
      className={`mx-auto w-full ${max} px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}
