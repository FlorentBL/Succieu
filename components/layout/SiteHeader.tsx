"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
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
      className={`relative whitespace-nowrap rounded-md px-2.5 py-2 text-[0.8125rem] font-medium leading-none tracking-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] xl:text-sm ${
        current
          ? "text-moss-dark after:absolute after:inset-x-1.5 after:bottom-0.5 after:h-[3px] after:rounded-full after:bg-moss"
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
  /** Un seul sous-menu desktop ouvert à la fois (les `<details>` natifs restent tous ouverts sinon). */
  const [openFlyoutHref, setOpenFlyoutHref] = useState<string | null>(null);
  const panelId = useId();

  useEffect(() => {
    setOpenFlyoutHref(null);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface/92 shadow-[0_10px_40px_-24px_rgba(26,22,20,0.28)] backdrop-blur-md supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 lg:gap-4 lg:px-8">
        <SiteLogo variant="header" />

        <nav className="hidden min-w-0 flex-1 justify-end xl:flex" aria-label="Navigation principale">
          <ul className="flex max-w-full flex-nowrap items-center justify-end gap-0.5 sm:gap-1">
            {mainNav.map((item) => {
              const isHome = item.href === "/";
              const active =
                isHome
                  ? pathname === "/"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              const sectionActive =
                Boolean(item.children) &&
                (pathname === item.href ||
                  pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href} className="relative shrink-0">
                  {item.children ? (
                    <details
                      className="group"
                      open={openFlyoutHref === item.href}
                      onToggle={(e) => {
                        const el = e.currentTarget;
                        if (el.open) {
                          setOpenFlyoutHref(item.href);
                        } else {
                          setOpenFlyoutHref((cur) =>
                            cur === item.href ? null : cur,
                          );
                        }
                      }}
                    >
                      <summary
                        className={`relative list-none cursor-pointer whitespace-nowrap rounded-md px-2.5 py-2 text-[0.8125rem] font-medium leading-none tracking-tight transition-colors xl:text-sm [&::-webkit-details-marker]:hidden ${
                          sectionActive
                            ? "text-moss-dark after:pointer-events-none after:absolute after:inset-x-1.5 after:bottom-0.5 after:h-[3px] after:rounded-full after:bg-moss"
                            : "text-ink-muted hover:bg-canvas hover:text-ink"
                        }`}
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {item.label}
                          <span className="text-[0.65rem] opacity-70" aria-hidden>
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
          className="inline-flex items-center justify-center rounded-full border border-border-subtle bg-canvas p-2.5 text-ink xl:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
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
          className="border-t border-border-subtle bg-surface xl:hidden"
        >
          <nav className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8" aria-label="Navigation mobile et tablette">
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
