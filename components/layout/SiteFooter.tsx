import Link from "next/link";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { HillArc } from "@/components/ui/HillArc";
import { MairieOpeningHours } from "@/components/ui/MairieOpeningHours";
import { siteConfig } from "@/lib/site";

const linkClass =
  "text-white/85 underline decoration-white/30 underline-offset-4 transition hover:text-white hover:decoration-colza focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-16 text-white">
      <HillArc variant="fill" className="h-10 text-moss-dark sm:h-16 lg:h-20" />
      <div className="bg-moss-dark">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
            <div className="space-y-4">
              <SiteLogo variant="footer" />
              <p className="max-w-xs text-sm leading-relaxed text-white/80">
                Commune nature du Nord-Isère, {siteConfig.tagline.toLowerCase()}.
              </p>
              <p className="text-sm leading-relaxed text-white/80">
                {siteConfig.streetAddress}
                <br />
                {siteConfig.postalCode} {siteConfig.city}
              </p>
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-colza">
                Contact
              </h2>
              <p className="mt-3 text-sm">
                <a href={siteConfig.phoneTel} className={linkClass}>
                  {siteConfig.phone}
                </a>
              </p>
              <p className="mt-2 text-sm">
                <a href={`mailto:${siteConfig.emails.mairie}`} className={linkClass}>
                  {siteConfig.emails.mairie}
                </a>
              </p>
              <MairieOpeningHours variant="footer" className="mt-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-colza">
                Liens utiles
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm">
                <li>
                  <Link href="/contact" className={linkClass}>
                    Contact & urgence
                  </Link>
                </li>
                <li>
                  <Link href="/ma-mairie/conseil" className={linkClass}>
                    Conseil municipal
                  </Link>
                </li>
                <li>
                  <Link href="/demarches/urbanisme" className={linkClass}>
                    Urbanisme
                  </Link>
                </li>
                <li>
                  <a href={siteConfig.urls.smnd} className={linkClass} rel="noopener noreferrer">
                    Collecte des déchets (SMND)
                  </a>
                </li>
                <li>
                  <a
                    href={siteConfig.urls.panneauPocket}
                    className={linkClass}
                    rel="noopener noreferrer"
                  >
                    Alertes PanneauPocket
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-12 border-t border-white/15 pt-6 text-xs leading-relaxed text-white/70">
            © {year} {siteConfig.name}. Informations sous réserve de validation
            municipale.
          </p>
        </div>
      </div>
    </footer>
  );
}
