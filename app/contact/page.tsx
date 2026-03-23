import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { MairieOpeningHours } from "@/components/ui/MairieOpeningHours";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Coordonnées et horaires de la mairie de Succieu : téléphone, e-mails des services, urgence.",
};

function ContactJsonLd() {
  const openingHoursSpecification = [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Tuesday",
      opens: "08:00",
      closes: "12:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Thursday",
      opens: "08:00",
      closes: "12:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Friday",
      opens: "14:00",
      closes: "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Saturday",
      opens: "08:30",
      closes: "12:00",
    },
  ];
  const data = {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    name: siteConfig.name,
    telephone: siteConfig.phoneTel.replace("tel:", ""),
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.streetAddress,
      addressLocality: siteConfig.city,
      postalCode: siteConfig.postalCode,
      addressCountry: siteConfig.country,
    },
    url: "https://www.succieu.fr/contact",
    email: siteConfig.emails.mairie,
    openingHoursSpecification,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function ContactPage() {
  return (
    <>
      <ContactJsonLd />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
          Contact
        </h1>
        <p className="mt-3 text-lg text-ink-muted">
          Pour joindre la mairie et les services municipaux.
        </p>

        <div className="mt-8 space-y-10">
          <Section title="Mairie" id="mairie">
            <Card>
              <p className="text-ink-muted">
                <strong className="text-ink">Adresse :</strong>
                <br />
                {siteConfig.streetAddress}
                <br />
                {siteConfig.postalCode} {siteConfig.city}
              </p>
              <p className="mt-4 text-ink-muted">
                <strong className="text-ink">Téléphone :</strong>{" "}
                <a
                  className="text-sage-dark underline underline-offset-2 hover:text-moss-dark"
                  href={siteConfig.phoneTel}
                >
                  {siteConfig.phone}
                </a>
              </p>
              <p className="mt-2 text-ink-muted">
                <strong className="text-ink">E-mail :</strong>{" "}
                <a
                  className="text-sage-dark underline underline-offset-2 hover:text-moss-dark"
                  href={`mailto:${siteConfig.emails.mairie}`}
                >
                  {siteConfig.emails.mairie}
                </a>
              </p>
              <div className="mt-6 border-t border-border-subtle pt-6">
                <p className="text-sm font-semibold text-ink">
                  Horaires d’accueil
                </p>
                <MairieOpeningHours className="mt-3" />
              </div>
            </Card>
          </Section>

          <Section title="Services" id="services">
            <div className="space-y-4">
              <Card>
                <h3 className="font-semibold text-ink">Urbanisme</h3>
                <p className="mt-1 text-ink-muted">
                  {siteConfig.phone} —{" "}
                  <a
                    className="text-sage-dark underline"
                    href={`mailto:${siteConfig.emails.urbanisme}`}
                  >
                    {siteConfig.emails.urbanisme}
                  </a>
                </p>
              </Card>
              <Card>
                <h3 className="font-semibold text-ink">CCAS</h3>
                <p className="mt-1 text-ink-muted">
                  {siteConfig.phone} —{" "}
                  <a
                    className="text-sage-dark underline"
                    href={`mailto:${siteConfig.emails.ccas}`}
                  >
                    {siteConfig.emails.ccas}
                  </a>
                </p>
              </Card>
              <Card>
                <h3 className="font-semibold text-ink">Périscolaire</h3>
                <p className="mt-1 text-ink-muted">
                  {siteConfig.phone} —{" "}
                  <a
                    className="text-sage-dark underline"
                    href={`mailto:${siteConfig.emails.periscolaire}`}
                  >
                    {siteConfig.emails.periscolaire}
                  </a>
                </p>
              </Card>
              <Card>
                <h3 className="font-semibold text-ink">Enquête publique PLU</h3>
                <p className="mt-1 text-ink-muted">
                  <a
                    className="text-sage-dark underline"
                    href={`mailto:${siteConfig.emails.enquetePlu}`}
                  >
                    {siteConfig.emails.enquetePlu}
                  </a>
                </p>
              </Card>
            </div>
          </Section>

          <Section title="Urgence" id="urgence">
            <p className="text-ink-muted">
              En cas d’urgence vitale, composez le{" "}
              <strong className="text-ink">15</strong> (SAMU), le{" "}
              <strong className="text-ink">17</strong> (police / gendarmerie) ou le{" "}
              <strong className="text-ink">18</strong> (pompiers), selon la
              situation.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
