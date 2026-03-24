import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Petite enfance & école",
  description:
    "Halte-garderie CAPI, assistantes maternelles, périscolaire et contacts — Succieu.",
};

export default function PetiteEnfancePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Petite enfance & école
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Accueil du jeune enfant, école et temps périscolaires. Les
        communications du conseil d’école et les documents pédagogiques à jour
        sont transmis par l’équipe enseignante ou l’école (courriel, cahier,
        outil numérique).
      </p>

      <div className="mt-10 space-y-10 prose-site">
        <Section id="ribambelle" title="Halte-garderie itinérante CAPI « La Ribambelle »">
          <p className="text-ink-muted">
            Enfants de 2,5 mois à 3 ans. 15 places. Accueil occasionnel.
          </p>
          <ul className="mt-2 text-ink-muted">
            <li>Eclose-Badinières : lundi 8h30–16h30</li>
            <li>Meyrie : mardi 8h30–16h30</li>
            <li>St-Alban-de-Roche : jeudi 8h30–16h30</li>
            <li>Nivolas-Vermelle : vendredi 8h30–16h30</li>
          </ul>
          <p className="mt-3 text-ink-muted">
            Tél. : 06 14 69 07 11 —{" "}
            <a href={siteConfig.urls.capi} className="text-sage-dark underline">
              capi-agglo.fr
            </a>
          </p>
        </Section>

        <Section id="assmat" title="Assistantes maternelles">
          <ul className="text-ink-muted">
            <li>
              <strong className="text-ink">Sandrine COUTURIER</strong> — 2241 route
              de Buffières — 06 89 33 64 17
            </li>
            <li>
              <strong className="text-ink">Éléna LARANJO</strong> — 71 chemin du
              Maillet — 06 75 08 45 05
            </li>
          </ul>
          <Card className="mt-4">
            <p className="text-sm text-ink-muted">
              Pour une liste d’assistantes maternelles agréées, disponibilités
              et aides :{" "}
              <a
                href={siteConfig.urls.cafIsere}
                rel="noopener noreferrer"
                className="font-medium text-sage-dark underline"
              >
                CAF de l’Isère
              </a>{" "}
              et la mairie (service petite enfance). Les coordonnées ci-dessus
              sont données à titre indicatif.
            </p>
          </Card>
        </Section>

        <Section id="periscolaire" title="Périscolaire">
          <ul className="text-ink-muted">
            <li>Garderie matin : 7h30 → 8h30</li>
            <li>Cantine : 11h30 → 13h30</li>
            <li>Garderie après-midi : 16h30 → 18h30</li>
          </ul>
          <p className="mt-3 text-ink-muted">
            Contact : {siteConfig.phone} —{" "}
            <a
              href={`mailto:${siteConfig.emails.periscolaire}`}
              className="text-sage-dark underline"
            >
              {siteConfig.emails.periscolaire}
            </a>
          </p>
        </Section>

        <Section id="ass-sociales" title="Assistantes sociales">
          <p className="text-ink-muted">
            Centre médico-social — Maison du Conseil général, 2e étage, 18 avenue
            Frédéric Dard, 38307 Bourgoin-Jallieu cedex. Tél. : 04 26 73 05 70.
          </p>
        </Section>
      </div>
    </div>
  );
}
