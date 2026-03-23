import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Associations",
  description:
    "Sport et Nature Succieu (ASN) et AS Succieu Terres Froides (rugby) — vie associative à Succieu.",
};

export default function AssociationsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Associations
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Sport, nature et convivialité.
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
      </div>
    </div>
  );
}
