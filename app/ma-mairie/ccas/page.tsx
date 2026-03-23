import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "CCAS",
  description:
    "Centre communal d’action sociale de Succieu — missions et contact.",
};

export default function CcasPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        CCAS
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Centre communal d&apos;action sociale — organisme lié à la municipalité.
      </p>

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
          <p className="mt-3 text-ink-muted">
            <strong className="text-ink">Membres du conseil municipal :</strong>{" "}
            Ludovic DUPOUY, Yoann SEGURA, Julia SORLIN, Julien VEYET, Guillaume
            VIAL
          </p>
          <p className="mt-3 text-ink-muted">
            <strong className="text-ink">Membres extérieurs :</strong> Elisabeth
            AEGERTER, Denise BARRAL, Geneviève BRON, Jean THUILLER
            (vice-président), Evelyne VEYET
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
  );
}
