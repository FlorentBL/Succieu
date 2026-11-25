"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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
  // Administration et Mon compte vont à droite, avec le nom et le réglage de taille du texte.
  const cote = (i: NavItem) => i.href.endsWith("/administration") || i.href.endsWith("/compte");
  const gauche = items.filter((i) => !cote(i));
  const droite = items.filter(cote);
  const prenom = displayName.trim().split(/\s+/)[0] || displayName;
  const compteActif = droite.some((i) => isActive(pathname, i.href));
  const menuRef = useRef<HTMLDetailsElement>(null);
  // Referme le menu du compte : changement de page, Échap (focus rendu au résumé), clic hors du menu.
  useEffect(() => {
    menuRef.current?.removeAttribute("open");
  }, [pathname]);
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) {
        el.removeAttribute("open");
        el.querySelector("summary")?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (el.open && !el.contains(e.target as Node)) el.removeAttribute("open");
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, []);
  const lien = (i: NavItem, dansMenu = false, classeLi?: string) => {
    const active = isActive(pathname, i.href);
    return (
      <li key={`${dansMenu ? "m" : "l"}${i.href}`} className={classeLi}>
        <Link
          href={i.href}
          aria-current={active ? "page" : undefined}
          className={`relative inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-[0.95rem] ${dansMenu ? "w-full rounded-lg" : "lg:px-2 xl:px-3"} font-medium transition-colors ${focusRing} ${
            active
              ? "text-ink after:absolute after:inset-x-3 after:bottom-1 after:h-[3px] after:rounded-full after:bg-tuile"
              : "text-ink-muted hover:bg-pre-pale hover:text-ink"
          }`}
        >
          {i.label}
        </Link>
      </li>
    );
  };
  return (
    <>
      <div className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:px-8">
          <nav aria-label="Espace des élus" className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-3 lg:flex-1">
            <ul className="flex flex-wrap gap-x-0.5">{gauche.map((i) => lien(i))}</ul>
            <ul className="flex flex-wrap items-center gap-x-0.5 lg:flex-nowrap">
              {droite.map((i) => (
                lien(i, false, "lg:hidden")
              ))}
              <li className="hidden lg:block">
                <details ref={menuRef} className="relative">
                  <summary
                    className={`flex min-h-11 cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-full px-2 text-[0.95rem] font-medium hover:bg-pre-pale xl:px-3 ${focusRing} ${compteActif ? "text-ink" : "text-ink-muted"}`}
                  >
                    <span className="sr-only">Connecté : </span>
                    <span className="max-w-[8rem] truncate font-semibold text-ink" title={displayName}>
                      {prenom}
                    </span>
                    <span aria-hidden="true" className="text-xs">▾</span>
                    <span className="sr-only"> — menu du compte</span>
                  </summary>
                  <ul className="absolute right-0 top-full z-30 mt-1 min-w-[12rem] rounded-xl border border-border-subtle bg-surface p-1 shadow-lg">
                    {droite.map((i) => lien(i, true))}
                  </ul>
                </details>
              </li>
              <li className="flex items-center gap-2 pl-1 text-sm text-ink-muted lg:pl-0">
                <span className="max-w-[10rem] truncate lg:hidden" title={displayName}>
                  <span className="sr-only">Connecté : </span>
                  <span className="font-semibold text-ink">{displayName}</span>
                </span>
                <TextSizeControl compact />
              </li>
            </ul>
          </nav>
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
