"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { mainNav } from "@/lib/site";

function NavLink({
  href,
  children,
  current,
}: {
  href: string;
  children: React.ReactNode;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-2 text-sm font-medium tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
        current
          ? "bg-ink text-surface shadow-sm"
          : "text-ink-muted hover:bg-canvas hover:text-ink"
      }`}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface/90 shadow-[0_8px_30px_-20px_rgba(26,22,20,0.25)] backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <SiteLogo variant="header" />

        <nav className="hidden lg:block" aria-label="Navigation principale">
          <ul className="flex flex-wrap items-center justify-end gap-1">
            {mainNav.map((item) => {
              const isHome = item.href === "/";
              const active =
                isHome
                  ? pathname === "/"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href} className="relative">
                  {item.children ? (
                    <details className="group">
                      <summary className="list-none cursor-pointer rounded-full px-3.5 py-2 text-sm font-medium tracking-wide text-ink-muted hover:bg-canvas hover:text-ink [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-1">
                          {item.label}
                          <span className="text-xs" aria-hidden>
                            ▾
                          </span>
                        </span>
                      </summary>
                      <ul className="absolute right-0 z-50 mt-2 min-w-[15rem] rounded-xl border border-border-subtle bg-surface py-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)]">
                        <li>
                          <Link
                            href={item.href}
                            className="block px-4 py-2 text-sm text-ink-muted hover:bg-canvas hover:text-ink"
                          >
                            Vue d’ensemble
                          </Link>
                        </li>
                        {item.children.map((c) => (
                          <li key={c.href}>
                            <Link
                              href={c.href}
                              className="block px-4 py-2 text-sm text-ink-muted hover:bg-canvas hover:text-ink"
                            >
                              {c.label}
                            </Link>
                        </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <NavLink href={item.href} current={active}>
                      {item.label}
                    </NavLink>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-border-subtle bg-canvas p-2.5 text-ink lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
          <span aria-hidden className="text-lg font-semibold">
            {open ? "✕" : "☰"}
          </span>
        </button>
      </div>

      {open ? (
        <div
          id={panelId}
          className="border-t border-border-subtle bg-surface lg:hidden"
        >
          <nav className="mx-auto max-w-6xl px-4 py-4" aria-label="Navigation mobile">
            <ul className="flex flex-col gap-1">
              {mainNav.map((item) => {
                const isHome = item.href === "/";
                const active =
                  isHome
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`block rounded-md px-3 py-2 text-base font-medium ${
                        active
                          ? "bg-stone-warm text-moss-dark"
                          : "text-ink hover:bg-canvas"
                      }`}
                    >
                      {item.label}
                    </Link>
                    {item.children ? (
                      <ul className="ml-3 mt-1 border-l border-stone-warm pl-3">
                        {item.children.map((c) => (
                          <li key={c.href}>
                            <Link
                              href={c.href}
                              onClick={() => setOpen(false)}
                              className="block rounded-md px-2 py-1.5 text-sm text-ink-muted hover:bg-canvas hover:text-ink"
                            >
                              {c.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
