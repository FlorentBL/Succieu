import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";

/** Aperçu de la variante B de l'accueil, pour validation. À retirer avant la mise en ligne. */
export const metadata: Metadata = {
  title: "Aperçu accueil B",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <HomePage variant="b" />;
}
