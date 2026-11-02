import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Mes démarches",
  description:
    "Démarches administratives et urbanisme — Mairie de Succieu.",
};

export default function DemarchesPage() {
  return (
    <div>
      <PageHero
        title="Mes démarches"
        description={<>Passeport, carte d’identité, recensement, urbanisme et dossiers CAPI.</>}
      />
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-2 sm:px-6">

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        <li>
          <Card className="h-full">
            <Link
              href="/demarches/administratif"
              className="block font-display text-lg font-semibold text-moss-dark underline-offset-4 hover:underline focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Démarches administratives
            </Link>
            <p className="mt-2 text-sm text-ink-muted">
              Passeport, CNI, recensement — rappels généraux.
            </p>
          </Card>
        </li>
        <li>
          <Card className="h-full">
            <Link
              href="/demarches/urbanisme"
              className="block font-display text-lg font-semibold text-moss-dark underline-offset-4 hover:underline focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Urbanisme
            </Link>
            <p className="mt-2 text-sm text-ink-muted">
              PLU, déclarations, CAPI et contacts.
            </p>
          </Card>
        </li>
      </ul>
    </div>
    </div>
  );
}
