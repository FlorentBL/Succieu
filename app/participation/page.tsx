import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Participation citoyenne",
  description:
    "Budget participatif et consultations — Mairie de Succieu.",
};

export default function ParticipationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Participation citoyenne
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Démarches participatives et concertation.
      </p>

      <div className="mt-10 space-y-10 prose-site">
        <Section id="bp" title="Budget participatif">
          <p className="text-ink-muted">
            Dispositif démocratique — 3 000 € TTC par édition. Ouvert aux habitants
            de plus de 12 ans, un projet par habitant et par an.
          </p>
        </Section>

        <Section id="consultation" title="Consultation citoyenne">
          <p className="text-ink-muted">
            Exemples sur l’ancien site : 1re Nuit de la démocratie (7 février 2025)
            — « Faire politique ensemble pour soigner nos territoires de vie ».
            Rencontres par hameaux (mars 2025) listant les quartiers et hameaux
            du territoire.
          </p>
          <p className="mt-3 text-sm text-ink-subtle">
            Calendrier des prochaines consultations : à publier lorsque fixé
            par la municipalité.
          </p>
        </Section>
      </div>
    </div>
  );
}
