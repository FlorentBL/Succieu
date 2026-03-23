import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { associationsList } from "@/lib/associations";
import { phoneToTelHref, professionalsList } from "@/lib/professionnels";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Associations et professionnels",
  description:
    "Associations sportives et culturelles, professionnels et services de proximité à Succieu.",
};

export default function AssociationsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Associations et professionnels
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Vie associative et acteurs économiques de la commune — deux thèmes réunis sur une
        même page, faute de volumes plus importants.
      </p>

      <div className="mt-10 space-y-10">
        {associationsList.map((assoc) => (
          <Section key={assoc.id} id={assoc.id} title={assoc.title}>
            <Card>
              <div className="space-y-3">
                {assoc.description.map((p, i) => (
                  <p key={`${assoc.id}-p-${i}`} className="text-ink-muted">
                    {p}
                  </p>
                ))}
              </div>
              {assoc.contacts?.length ? (
                <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                  {assoc.contacts.map((c, i) => (
                    <li key={`${assoc.id}-c-${i}`}>
                      {c.kind === "text" ? (
                        c.text
                      ) : (
                        <>
                          {c.label}
                          {" : "}
                          <a
                            href={c.href}
                            rel={
                              c.href.startsWith("mailto:")
                                ? undefined
                                : "noopener noreferrer"
                            }
                            className="text-sage-dark underline"
                          >
                            {c.href.startsWith("mailto:")
                              ? c.href.replace(/^mailto:/, "")
                              : c.href.replace(/^https?:\/\//i, "")}
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          </Section>
        ))}

        <Section id="professionnels" title="Professionnels et services de proximité">
          <div className="space-y-6">
            <div className="space-y-3 text-ink-muted">
              <p>
                Commerces, artisans et services repérés sur la commune, par ordre
                alphabétique. Les fiches sont données à titre indicatif ; seules les
                informations communiquées par les professionnels ou visibles sur leurs
                supports officiels font foi.
              </p>
              <p className="text-sm text-ink-subtle">
                Sous réserve de modifications — merci de signaler toute erreur à la
                mairie.
              </p>
            </div>

            <ul className="space-y-5">
              {professionalsList.map((pro) => (
                <li key={pro.id}>
                  <Card>
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {pro.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {pro.serviceDescription}
                    </p>
                    {pro.addressLine ? (
                      <p className="mt-3 text-sm text-ink-muted">
                        <strong className="text-ink">Adresse :</strong> {pro.addressLine}
                      </p>
                    ) : null}
                    <ul className="mt-3 space-y-1.5 text-sm text-ink-muted">
                      {pro.phone ? (
                        <li>
                          <strong className="text-ink">Téléphone :</strong>{" "}
                          <a
                            href={phoneToTelHref(pro.phone)}
                            className="text-sage-dark underline underline-offset-2"
                          >
                            {pro.phone}
                          </a>
                        </li>
                      ) : null}
                      {pro.website ? (
                        <li>
                          <strong className="text-ink">Site web :</strong>{" "}
                          <a
                            href={pro.website}
                            rel="noopener noreferrer"
                            className="text-sage-dark underline underline-offset-2"
                          >
                            {pro.website.replace(/^https?:\/\//i, "")}
                          </a>
                        </li>
                      ) : null}
                      {pro.mapsUrl ? (
                        <li>
                          <a
                            href={pro.mapsUrl}
                            rel="noopener noreferrer"
                            className="font-medium text-sage-dark underline underline-offset-2"
                          >
                            Voir sur Google Maps
                          </a>
                        </li>
                      ) : null}
                    </ul>
                  </Card>
                </li>
              ))}
            </ul>

            <Card>
              <p className="text-sm text-ink-muted">
                Pour toute correction, ajout ou retrait :{" "}
                <Link
                  href="/contact"
                  className="font-medium text-sage-dark underline underline-offset-2"
                >
                  page Contact
                </Link>{" "}
                ou mairie au{" "}
                <a
                  href={siteConfig.phoneTel}
                  className="font-medium text-sage-dark underline underline-offset-2"
                >
                  {siteConfig.phone}
                </a>
                .
              </p>
            </Card>
          </div>
        </Section>
      </div>
    </div>
  );
}
