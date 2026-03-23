import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Mes démarches",
  description:
    "Démarches administratives et urbanisme — Mairie de Succieu.",
};

export default function DemarchesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Mes démarches
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Passeport, carte d’identité, recensement, urbanisme et dossiers CAPI.
      </p>

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
  );
}
