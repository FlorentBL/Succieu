import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Ma Mairie",
  description:
    "Conseil municipal, CCAS, identité et histoire — Mairie de Succieu.",
};

export default function MaMairiePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Ma Mairie
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Institution, élus et vie communale.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-1">
        <li>
          <Card>
            <Link
              href="/ma-mairie/conseil"
              className="font-display text-lg font-semibold text-moss-dark underline-offset-4 hover:underline focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Conseil municipal
            </Link>
            <p className="mt-2 text-sm text-ink-muted">
              Maire, adjoints et conseillers.
            </p>
          </Card>
        </li>
        <li>
          <Card>
            <Link
              href="/ma-mairie/ccas"
              className="font-display text-lg font-semibold text-moss-dark underline-offset-4 hover:underline focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              CCAS
            </Link>
            <p className="mt-2 text-sm text-ink-muted">
              Centre communal d’action sociale — actions et contacts.
            </p>
          </Card>
        </li>
        <li>
          <Card>
            <Link
              href="/ma-mairie/identite"
              className="font-display text-lg font-semibold text-moss-dark underline-offset-4 hover:underline focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Identité & histoire
            </Link>
            <p className="mt-2 text-sm text-ink-muted">
              Blason, paysage et origine du nom de Succieu.
            </p>
          </Card>
        </li>
      </ul>
    </div>
  );
}
