"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/** Espaces non mesurés : bureau, modération, administration. */
const EXCLUDED_PREFIXES = ["/espace-bureau", "/moderation", "/admin", "/api"];

/** Mesure d'audience Umami auto-hébergée : sans cookie ni stockage local. */
export function Analytics() {
  const pathname = usePathname() ?? "";
  if (
    EXCLUDED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return null;
  }
  return (
    <Script
      src="https://stats.succieu.fr/script.js"
      data-website-id="de04bd5d-b426-4e32-a81e-0f464758356b"
      data-domains="succieu.fr,www.succieu.fr"
      strategy="afterInteractive"
    />
  );
}
