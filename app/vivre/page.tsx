import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Vivre à Succieu",
  description:
    "Marché, collecte des déchets, bruit, mobilité et télé-alarme — informations pour le quotidien à Succieu.",
};

export default function VivrePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Vivre à Succieu
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Services du quotidien : marché, déchets, déplacements et solidarité.
        Pour les transports, les horaires et fréquences à jour sont ceux publiés
        par la Région et chaque opérateur (liens dans la section Mobilité).
      </p>

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

        <Section id="bruit" eyebrow="Voisinage" title="Bruit">
          <p className="text-ink-muted">
            Les travaux de bricolage ou de jardinage réalisés par des
            particuliers à l’aide d’outils bruyants (tondeuse, tronçonneuse,
            perceuse, etc.) sont autorisés uniquement aux horaires suivants.
          </p>
          <Card className="mt-4">
            <ul className="space-y-3 text-sm text-ink-muted">
              <li>
                <strong className="text-ink">Jours ouvrables</strong> : de 8h30 à
                12h00 et de 14h00 à 19h30.
              </li>
              <li>
                <strong className="text-ink">Samedis</strong> : de 9h00 à 12h00 et
                de 15h00 à 19h00.
              </li>
              <li>
                <strong className="text-ink">Dimanches et jours fériés</strong> :
                de 10h00 à 12h00.
              </li>
            </ul>
          </Card>
          <p className="text-sm text-ink-muted">
            Ces horaires sont définis par l’arrêté préfectoral relatif aux
            nuisances sonores.
          </p>
        </Section>

        <Section id="decheteries" title="Déchèteries">
          <p className="text-ink-muted">
            Les <strong className="text-ink">horaires et l’accès</strong> aux
            déchèteries du territoire sont publiés par le{" "}
            <strong className="text-ink">SMND</strong> (syndicat). La{" "}
            <strong className="text-ink">CAPI</strong> indique aussi les
            déchèteries du territoire Porte de l’Isère — ne vous fiez pas à des
            horaires recopiés ailleurs.
          </p>
          <Card className="mt-4">
            <p className="text-sm font-semibold text-ink">Liens utiles</p>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-ink-muted">
              <li>
                <a
                  href={siteConfig.urls.smndDechetteriesHoraires}
                  rel="noopener noreferrer"
                  className="font-medium text-sage-dark underline"
                >
                  Horaires et accès — SMND
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.urls.capiDechetteries}
                  rel="noopener noreferrer"
                  className="font-medium text-sage-dark underline"
                >
                  Déchèteries — CAPI Porte de l’Isère
                </a>
              </li>
            </ul>
          </Card>
          <p className="mt-4 text-sm text-ink-muted">
            Exemples de sites souvent utilisés depuis le secteur : Châteauvilain,
            Nivolas-Vermelle, Biol, St-Victor-de-Cessieu — la liste et les
            créneaux à jour sont sur les liens ci-dessus.
          </p>
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
            Dispositif pour personnes âgées ou en situation de handicap. Tarif,
            inscription et aides (APA, caisses de retraite, etc.) : voir le site
            du{" "}
            <a
              href={siteConfig.urls.isereAutonomie}
              rel="noopener noreferrer"
              className="font-medium text-sage-dark underline"
            >
              Département de l’Isère — Autonomie
            </a>{" "}
            et contacter le service pour une estimation à jour. La mairie peut
            orienter vers les interlocuteurs.
          </p>
        </Section>
      </div>
    </div>
  );
}
