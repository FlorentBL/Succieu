import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { PageHero } from "@/components/ui/PageHero";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "CCAS",
  description:
    "Centre communal d’action sociale de Succieu — missions et contact.",
};

export default function CcasPage() {
  return (
    <div>
      <PageHero
        title="CCAS"
        description={<>Centre communal d&apos;action sociale — organisme lié à la municipalité.</>}
      />
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-2 sm:px-6">

      <div className="mt-10 space-y-10 prose-site">
        <Section id="presentation" title="Présentation">
          <p className="text-ink-muted">
            Le CCAS est un organisme lié à la municipalité, autonome, qui
            développe des actions sociales. Il apporte une aide financière et
            morale aux personnes en difficulté.
          </p>
        </Section>

        <Section id="actions" title="Actions">
          <ul className="text-ink-muted">
            <li>Aide financière pour candidats au BAFA</li>
            <li>
              Aide financière aux familles pour les centres aérés
            </li>
            <li>
              Organisation du repas des aînés et distribution des colis de Noël
            </li>
          </ul>
        </Section>

        <Section id="composition" title="Composition">
          <p className="text-ink-muted">
            <strong className="text-ink">Président :</strong> Hervé CASSE
          </p>
        </Section>

        <Section id="contact-ccas" title="Contact">
          <p className="text-ink-muted">
            {siteConfig.phone} —{" "}
            <a
              href={`mailto:${siteConfig.emails.ccas}`}
              className="text-sage-dark underline"
            >
              {siteConfig.emails.ccas}
            </a>
          </p>
        </Section>
      </div>
    </div>
    </div>
  );
}
