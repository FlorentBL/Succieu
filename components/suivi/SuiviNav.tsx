"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { focus } from "./ui";

const BASE = "/espace-bureau/bureau";
export type Onglet = { href: string; label: string; aussi?: string[] };

/** Sous-navigation du module : l'onglet courant est marqué en texte (aria-current) et en couleur. */
export function SuiviNav({ onglets, exportHref }: { onglets: Onglet[]; exportHref?: string }) {
  const pathname = usePathname();
  const actif = (o: Onglet) => (o.aussi ?? []).includes(pathname) || (o.href === BASE ? pathname === BASE : pathname === o.href || pathname.startsWith(`${o.href}/`));
  return (
    <nav aria-label="Espace Bureau : sections" className="print:hidden">
      <ul className="flex flex-wrap items-center gap-1.5">
        {onglets.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              aria-current={actif(o) ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-[0.95rem] font-semibold ${focus} ${
                actif(o) ? "border-moss-dark bg-moss-dark text-white" : "border-ink-subtle/40 bg-surface text-ink hover:bg-pre-pale"
              }`}
            >
              {o.label}
            </Link>
          </li>
        ))}
        {exportHref ? (
          <li className="ml-auto">
            <a href={exportHref} download className={`inline-flex min-h-11 items-center rounded-full px-3 text-[0.95rem] font-semibold text-moss-dark underline ${focus}`}>
              Télécharger en Excel
            </a>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
