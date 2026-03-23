import Link from "next/link";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-brass/25 bg-[#141210] text-stone-200">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr]">
          <div className="space-y-4">
            <SiteLogo variant="footer" />
            <p className="text-sm leading-relaxed text-stone-400">
              {siteConfig.tagline} — {siteConfig.postalCode} {siteConfig.city},{" "}
              {siteConfig.country}
            </p>
          </div>
          <div>
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-brass-muted">
              Contact
            </h2>
            <p className="mt-3 text-sm">
              <a
                href={siteConfig.phoneTel}
                className="text-stone-100 underline decoration-stone-600 underline-offset-4 transition hover:decoration-brass-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {siteConfig.phone}
              </a>
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Horaires d’accueil : à confirmer auprès de la mairie.
            </p>
          </div>
          <div>
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-brass-muted">
              Liens utiles
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  href="/contact"
                  className="text-stone-300 underline decoration-stone-700 underline-offset-4 transition hover:text-white hover:decoration-brass-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Contact & urgence
                </Link>
              </li>
              <li>
                <Link
                  href="/ma-mairie/conseil"
                  className="text-stone-300 underline decoration-stone-700 underline-offset-4 transition hover:text-white hover:decoration-brass-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Conseil municipal
                </Link>
              </li>
              <li>
                <Link
                  href="/demarches/urbanisme"
                  className="text-stone-300 underline decoration-stone-700 underline-offset-4 transition hover:text-white hover:decoration-brass-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Urbanisme
                </Link>
              </li>
              <li>
                <a
                  href={siteConfig.urls.smnd}
                  className="text-stone-300 underline decoration-stone-700 underline-offset-4 transition hover:text-white hover:decoration-brass-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  rel="noopener noreferrer"
                >
                  Collecte des déchets (SMND)
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-white/10 pt-8 text-xs leading-relaxed text-stone-600">
          © {year} {siteConfig.name}. Informations sous réserve de validation
          municipale.
        </p>
      </div>
    </footer>
  );
}
