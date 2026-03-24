import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Urbanisme",
  description:
    "Urbanisme à Succieu : PLU, CAPI, certificats d’urbanisme, déclarations préalables et contacts.",
};

export default function UrbanismePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Urbanisme
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Dépôt des dossiers, règlement et procédures. Pour le document
        d’urbanisme en vigueur (PLU, cartes), la référence est celle publiée sur
        le Géoportail ; le service urbanisme et la CAPI peuvent vous
        renseigner.
      </p>

      <Card className="mt-8">
        <p className="text-sm font-semibold text-ink">Sources officielles</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-muted">
          <li>
            <a
              href={siteConfig.urls.geoportailUrbanisme}
              className="font-medium text-sage-dark underline"
              rel="noopener noreferrer"
            >
              Géoportail de l’urbanisme
            </a>{" "}
            — document d’urbanisme (PLU, cartes) en vigueur
          </li>
          <li>
            <a
              href={siteConfig.urls.capi}
              className="font-medium text-sage-dark underline"
              rel="noopener noreferrer"
            >
              CAPI — Porte de l’Isère
            </a>{" "}
            — compétence planification, dossiers en ligne
          </li>
        </ul>
      </Card>

      <div className="mt-10 space-y-12 prose-site">
        <Section id="contact-urb" title="Contact">
          <p className="text-ink-muted">
            <strong className="text-ink">Téléphone :</strong> {siteConfig.phone}{" "}
            —{" "}
            <a
              href={`mailto:${siteConfig.emails.urbanisme}`}
              className="font-medium text-sage-dark underline"
            >
              {siteConfig.emails.urbanisme}
            </a>
          </p>
          <p className="mt-3 text-ink-muted">
            Dépôt des dossiers via le{" "}
            <strong className="text-ink">portail CAPI</strong> depuis janvier
            2022.
          </p>
        </Section>

        <Section id="cu" title="Certificat d’urbanisme">
          <ul className="text-ink-muted">
            <li>
              <strong className="text-ink">CU d’information</strong> : délai 1 mois,
              validité 18 mois
            </li>
            <li>
              <strong className="text-ink">CU opérationnel</strong> : délai 2 mois,
              validité 18 mois
            </li>
          </ul>
        </Section>

        <Section id="dp" title="Déclaration préalable">
          <ul className="text-ink-muted">
            <li>Délai d’instruction : 1 mois</li>
            <li>Validité : 3 ans</li>
            <li>Recours : 2 mois après réponse</li>
          </ul>
        </Section>

        <Section id="pc" title="Permis de construire">
          <ul className="text-ink-muted">
            <li>
              Délai : 2 mois (maison individuelle), 3 mois (autres cas)
            </li>
            <li>
              Architecte obligatoire au-delà de 150 m² de surface de plancher
            </li>
          </ul>
        </Section>

        <Section id="plu" title="PLU — Règlement d’urbanisme">
          <p className="text-ink-muted">Documents habituellement disponibles :</p>
          <ol className="mt-2 list-decimal pl-6 text-ink-muted">
            <li>Rapport de présentation</li>
            <li>PADD (Projet d’Aménagement et de Développement Durable)</li>
            <li>OAP (Orientation d’Aménagement et de Programmation)</li>
            <li>Règlement écrit et cartes de zonage (commune entière et secteurs)</li>
          </ol>
        </Section>
      </div>
    </div>
  );
}
