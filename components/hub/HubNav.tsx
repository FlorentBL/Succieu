"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { focusRing } from "@/components/bureau/fields";
import { TextSizeControl } from "./TextSize";

export type NavItem = { href: string; label: string; level?: "read" | "write" };

function isActive(pathname: string, href: string) {
  return href === "/espace-bureau" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Navigation du hub : modules autorisés, compte, administration ; avertit sur un module en lecture seule. */
export function HubNav({ items, displayName }: { items: NavItem[]; displayName: string }) {
  const pathname = usePathname();
  const current = items.find((i) => i.href !== "/espace-bureau" && isActive(pathname, i.href));
  return (
    <>
      <div className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <nav aria-label="Espace bureau">
            <ul className="flex flex-wrap gap-1">
              {items.map((i) => {
                const active = isActive(pathname, i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative inline-flex min-h-11 items-center rounded-full px-3.5 text-[0.95rem] font-medium transition-colors ${focusRing} ${
                        active
                          ? "text-ink after:absolute after:inset-x-3 after:bottom-1 after:h-[3px] after:rounded-full after:bg-tuile"
                          : "text-ink-muted hover:bg-pre-pale hover:text-ink"
                      }`}
                    >
                      {i.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-sm text-ink-muted">
              Connecté : <span className="font-semibold text-ink">{displayName}</span>
            </p>
            <TextSizeControl />
          </div>
        </div>
      </div>
      {current?.level === "read" ? (
        <div className="border-b border-colza/60 bg-colza-pale">
          <p role="status" className="mx-auto max-w-6xl px-4 py-2.5 text-[0.95rem] text-ink sm:px-6 lg:px-8">
            <span className="font-semibold">Lecture seule.</span> Vous pouvez consulter « {current.label} » mais pas le modifier.
          </p>
        </div>
      ) : null}
    </>
  );
}
