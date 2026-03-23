import type { Metadata } from "next";
import { NoticeMairie } from "@/components/ui/NoticeMairie";
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
        Dépôt des dossiers, règlement et procédures — informations issues de
        l’ancien site, à mettre à jour après les procédures en cours.
      </p>

      <NoticeMairie>
        Le PLU fait l’objet de modifications et d’enquêtes publiques. Vérifiez
        toujours la version en vigueur et les dates auprès du service
        urbanisme ou du portail CAPI.
      </NoticeMairie>

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

        <Section id="enquete-plu" eyebrow="Procédure" title="Enquête publique PLU">
          <p className="text-ink-muted">
            Au moment de l’export du site (mars 2026), une modification du PLU
            était annoncée :
          </p>
          <ul className="mt-2 text-ink-muted">
            <li>Modification n°1 du PLU + mise à jour du zonage assainissement</li>
            <li>
              Enquête du 6 janvier 2026 au 7 février 2026 (dates à confirmer
              après clôture)
            </li>
            <li>
              Contact :{" "}
              <a
                href={`mailto:${siteConfig.emails.enquetePlu}`}
                className="text-sage-dark underline"
              >
                {siteConfig.emails.enquetePlu}
              </a>
            </li>
          </ul>
        </Section>

        <Section id="zaenr" title="ZAENR (énergies renouvelables)">
          <ul className="text-ink-muted">
            <li>Loi APER du 10 mars 2023</li>
            <li>Concertation : 17 juin → 19 juillet 2024</li>
            <li>
              Contact :{" "}
              <a
                href={`mailto:${siteConfig.emails.urbanisme}`}
                className="text-sage-dark underline"
              >
                {siteConfig.emails.urbanisme}
              </a>
            </li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
