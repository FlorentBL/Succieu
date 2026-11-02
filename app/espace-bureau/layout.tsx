import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace bureau",
  robots: { index: false, follow: false, nocache: true },
};

export default function EspaceBureauLayout({ children }: { children: React.ReactNode }) {
  return children;
}
