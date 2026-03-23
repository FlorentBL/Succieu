import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { associationsList } from "@/lib/associations";
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
          <Card>
            <p className="text-ink-muted">
              Commerces, artisans, professions libérales et autres services complètent
              l’offre locale. Les effectifs restant limités, cette rubrique tient lieu
              d’information générale plutôt qu’annuaire exhaustif.
            </p>
            <p className="mt-4 text-ink-muted">
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
        </Section>
      </div>
    </div>
  );
}
