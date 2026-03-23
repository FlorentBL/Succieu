import type { Metadata } from "next";
import { NoticeMairie } from "@/components/ui/NoticeMairie";
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
        Accueil du jeune enfant, école et temps périscolaires.
      </p>

      <NoticeMairie>
        Compte-rendus conseil d&apos;école et documents pédagogiques : anciennes
        dates sur l’ancien site — à mettre à jour avec l’équipe enseignante.
      </NoticeMairie>

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
          <NoticeMairie>
            Liste des assistantes maternelles : confirmer les disponibilités et
            coordonnées auprès de la mairie ou du relais petite enfance.
          </NoticeMairie>
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
