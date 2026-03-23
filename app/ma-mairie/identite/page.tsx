import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Identité & histoire",
  description:
    "Blason, logo et histoire de Succieu — Terres Froides, Nord-Isère.",
};

export default function IdentitePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Identité & histoire
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Racines du village et identité visuelle.
      </p>

      <div className="mt-10 space-y-10 prose-site">
        <Section id="identite-visuelle" title="Identité visuelle">
          <p className="text-ink-muted">
            Logo dessiné entre 2020 et 2026 — inspiré du blason original de 1987
            (J. Zambardi). L&apos;étourneau perché sur le « S » de Succieu, colline
            stylisée en référence au côté vallonné du territoire.
          </p>
          <p className="mt-3 text-sm text-ink-subtle">
            Fichiers logo et charte graphique : à intégrer lorsque les fichiers
            seront disponibles sur le nouveau site.
          </p>
        </Section>

        <Section id="histoire" title="Un peu d’histoire">
          <p className="text-ink-muted">
            Succieu, porte des Terres Froides. Le nom viendrait du latin
            « Sociacco » (sureau) ou d&apos;un propriétaire gallo-romain. On
            trouve des traces d&apos;occupation gallo-romaine. Les premiers
            documents connus remontent au IXe siècle (acte entre le chapitre
            Saint-Maurice de Vienne et le prieuré de Succieu).
          </p>
        </Section>
      </div>
    </div>
  );
}
