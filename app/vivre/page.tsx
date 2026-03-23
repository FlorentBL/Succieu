import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { NoticeMairie } from "@/components/ui/NoticeMairie";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Vivre à Succieu",
  description:
    "Marché, collecte des déchets, mobilité et télé-alarme — informations pour le quotidien à Succieu.",
};

export default function VivrePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Vivre à Succieu
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Services du quotidien : marché, déchets, déplacements et solidarité.
      </p>

      <NoticeMairie>
        Horaires de bus « Vie pratique » et fréquences : vérifier auprès des
        opérateurs — certaines fiches anciennes sont obsolètes.
      </NoticeMairie>

      <div className="mt-10 space-y-12 prose-site">
        <Section
          id="marche"
          eyebrow="Vie locale"
          title="Marché hebdomadaire"
        >
          <p className="text-ink-muted">
            Le <strong className="text-ink">samedi matin</strong> — stand de Guy,
            fruits et légumes d’agriculture raisonnée (Drôme). Commandes possibles
            : pain, viennoiseries, œufs, volailles.
          </p>
        </Section>

        <Section id="dechets" eyebrow="Environnement" title="Collecte des déchets">
          <ul className="text-ink-muted">
            <li>
              <strong className="text-ink">Ordures ménagères</strong> : chaque
              vendredi matin (sortir le jeudi soir).
            </li>
            <li>
              <strong className="text-ink">Points d’apport volontaire</strong> : 2
              sites — village et stade du Gapillon (verre uniquement).
            </li>
          </ul>
          <Card className="mt-4">
            <p className="text-sm text-ink-muted">
              Informations détaillées SMND :{" "}
              <a
                href={siteConfig.urls.smnd}
                rel="noopener noreferrer"
                className="font-medium text-sage-dark underline"
              >
                calendrier Succieu (SMND)
              </a>
              .
            </p>
          </Card>
        </Section>

        <Section id="decheteries" title="Déchèteries proches">
          <ul className="text-ink-muted">
            <li>
              <strong className="text-ink">Châteauvilain</strong> : mer 17h30–19h30
              / ven 15h30–18h30 / sam 13h30–18h
            </li>
            <li>
              <strong className="text-ink">Nivolas-Vermelle</strong> : mer–jeu–ven
              9h–12h / 14h–18h / sam 9h–12h / 14h–18h
            </li>
            <li>
              <strong className="text-ink">Biol</strong> : lun–mer 13h30–17h30 / sam
              9h–12h et 13h30–17h30
            </li>
            <li>
              <strong className="text-ink">St-Victor-de-Cessieu</strong> : lun–mer
              13h30–17h30 / sam 9h–12h 13h30–17h30
            </li>
          </ul>
          <NoticeMairie>
            Horaires des déchèteries : confirmer sur les sites des syndicats ou
            intercommunalités avant de vous déplacer.
          </NoticeMairie>
        </Section>

        <Section id="mobilite" eyebrow="Déplacements" title="Mobilité">
          <div className="space-y-6 text-ink-muted">
            <div>
              <h3 className="font-semibold text-ink">Transport scolaire (Transisère)</h3>
              <ul className="mt-2">
                <li>Collège Champier (CHM03)</li>
                <li>
                  Bourgoin-Jallieu : Collège Pré-Bénit, Lycée Oiselet, LEP Gambetta,
                  LEP Jean-Claude Aubry, Lycée St-Marc (Nivolas)
                </li>
              </ul>
              <p className="mt-2 text-sm">
                Infos :{" "}
                <a
                  href={siteConfig.urls.regionTransport}
                  rel="noopener noreferrer"
                >
                  laregionvoustransporte.fr
                </a>{" "}
                — 04 26 73 38 38
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink">RUBAN (lignes 20 et 21)</h3>
              <p className="mt-1">
                Réservation au 04 74 94 62 03 (2 h avant) ou{" "}
                <a href={siteConfig.urls.ruban} rel="noopener noreferrer">
                  rubantransport.com
                </a>
                .
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink">LANE (Val d’Agny)</h3>
              <p className="mt-1">
                Eclose-Badinières → Bourgoin → Lyon Mermoz. Application :{" "}
                <a href={siteConfig.urls.lane} rel="noopener noreferrer">
                  lanemove.com
                </a>
              </p>
            </div>
          </div>
        </Section>

        <Section id="telealarme" title="Télé-alarme">
          <p className="text-ink-muted">
            Service public Nord-Isère pour personnes âgées ou en situation de
            handicap. Environ 33 €/mois, déduction fiscale 50 % possible selon
            situation. Aides : APA, caisses de retraite, APCH.
          </p>
          <NoticeMairie>
            Tarifs et modalités d’inscription : confirmer auprès du service
            départemental ou de la mairie.
          </NoticeMairie>
        </Section>
      </div>
    </div>
  );
}
