"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { IconChevronDown, IconClose, IconMenu, IconPhone } from "@/components/icons/UiIcons";
import { TodayStatus } from "@/components/ui/TodayStatus";
import { mainNav, siteConfig } from "@/lib/site";

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
      className={`relative whitespace-nowrap rounded-full px-3 py-2 text-[0.875rem] font-medium leading-none tracking-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] xl:text-sm ${
        current
          ? "text-ink after:absolute after:inset-x-2.5 after:-bottom-0.5 after:h-[3px] after:rounded-full after:bg-tuile"
          : "text-ink-muted hover:bg-pre-pale hover:text-ink"
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
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface shadow-[0_8px_24px_-20px_rgba(20,33,26,0.35)]">
      <div className="bg-moss-dark">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1 sm:px-6 lg:px-8">
          <TodayStatus variant="bar" />
          <a
            href={siteConfig.phoneTel}
            className="hidden min-h-8 items-center gap-2 text-sm text-white/90 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:inline-flex"
          >
            <IconPhone className="h-4 w-4" />
            {siteConfig.phone}
          </a>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:gap-4 lg:px-8">
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
                        className={`relative list-none cursor-pointer whitespace-nowrap rounded-full px-3 py-2 text-[0.875rem] font-medium leading-none tracking-tight transition-colors xl:text-sm [&::-webkit-details-marker]:hidden ${
                          sectionActive
                            ? "text-ink after:pointer-events-none after:absolute after:inset-x-2.5 after:-bottom-0.5 after:h-[3px] after:rounded-full after:bg-tuile"
                            : "text-ink-muted hover:bg-pre-pale hover:text-ink"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {item.label}
                          <IconChevronDown className="h-3.5 w-3.5 opacity-70 transition-transform group-open:rotate-180" />
                        </span>
                      </summary>
                      <ul className="absolute right-0 z-50 mt-2 min-w-[15rem] rounded-2xl border border-border-subtle bg-surface p-1.5 shadow-[0_18px_40px_-18px_rgba(20,33,26,0.28)]">
                        <li>
                          <Link
                            href={item.href}
                            className="block rounded-xl px-3.5 py-2.5 text-sm text-ink-muted hover:bg-pre-pale hover:text-ink"
                          >
                            Vue d’ensemble
                          </Link>
                        </li>
                        {item.children.map((c) => (
                          <li key={c.href}>
                            <Link
                              href={c.href}
                              className="block rounded-xl px-3.5 py-2.5 text-sm text-ink-muted hover:bg-pre-pale hover:text-ink"
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
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-pre-pale text-ink xl:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Fermer le menu" : "Ouvrir le menu"}</span>
          {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
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
                          ? "bg-pre-pale text-moss-dark"
                          : "text-ink hover:bg-pre-pale"
                      }`}
                    >
                      {item.label}
                    </Link>
                    {item.children ? (
                      <ul className="ml-3 mt-1 border-l-2 border-pre-pale pl-3">
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
