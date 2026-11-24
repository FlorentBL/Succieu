import type { Metadata } from "next";
import { TextSizeApplier } from "@/components/hub/TextSize";
import { TEXT_SIZE_SCRIPT } from "@/components/hub/sizeStore";

export const metadata: Metadata = {
  title: "Espace des élus",
  robots: { index: false, follow: false, nocache: true },
};

export default function EspaceBureauLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_SCRIPT }} />
      <TextSizeApplier />
      {children}
    </>
  );
}
