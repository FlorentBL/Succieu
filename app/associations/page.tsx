import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Associations et professionnels",
  description:
    "Associations sportives et vie associative, professionnels et services de proximité à Succieu.",
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
        <Section id="asn" title="Sport et Nature Succieu (ASN)">
          <Card>
            <p className="text-ink-muted">
              Cardio, course à pied, marche nordique. Sorties famille le dimanche.
            </p>
            <ul className="mt-3 text-sm text-ink-muted">
              <li>
                <a
                  href="mailto:sportnaturesuccieu@gmail.com"
                  className="text-sage-dark underline"
                >
                  sportnaturesuccieu@gmail.com
                </a>
              </li>
              <li>Facebook : SportNatureSuccieu</li>
              <li>
                <a
                  href="https://asn.sportsregions.fr"
                  rel="noopener noreferrer"
                  className="text-sage-dark underline"
                >
                  asn.sportsregions.fr
                </a>
              </li>
            </ul>
          </Card>
        </Section>

        <Section id="asstf" title="AS Succieu Terres Froides (ASSTF)">
          <Card>
            <p className="text-ink-muted">
              Rugby depuis 1979. Environ 250 licenciés. Catégories baby à seniors,
              M6 à M19, rugby à V. Les « Blacks ».
            </p>
          </Card>
        </Section>

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
