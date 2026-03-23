import type { Metadata } from "next";
import { Section } from "@/components/ui/Section";
import { councilMembers } from "@/lib/council";

const logoAuthorLine =
  councilMembers.find(
    (m) =>
      m.firstName === "Florence" && m.lastName === "ESTELLES-MOUTOT",
  )?.line ?? "Florence ESTELLES-MOUTOT";

export const metadata: Metadata = {
  title: "Identité & histoire",
  description:
    "Blason, logo et histoire de Succieu — géographie, patrimoine, Terres Froides, Nord-Isère.",
};

export default function IdentitePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Identité & histoire
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Racines du village et identité visuelle.
      </p>

      <div className="mt-10 space-y-10 prose-site">
        <Section id="identite-visuelle" title="Identité visuelle">
          <p className="text-ink-muted">
            Logo dessiné entre 2020 et 2026 par {logoAuthorLine}, conseillère
            municipale — inspiré du blason original de 1987 (J. Zambardi).
            L&apos;étourneau perché sur le « S » de Succieu, colline stylisée en
            référence au côté vallonné du territoire.
          </p>
        </Section>

        <Section id="histoire" title="Un peu d’histoire">
          <div className="space-y-8">
            <p className="text-ink-muted">
              Succieu, porte des Terres Froides. Le nom viendrait du latin
              « Sociacco » (sureau) ou d&apos;un propriétaire gallo-romain.
            </p>

            <article className="space-y-3">
              <h3 className="font-display text-xl font-semibold text-ink">
                Géographie et territoire
              </h3>
              <p className="text-ink-muted">
                Succieu se trouve sur un modeste plateau dominant la vallée de la
                Bourbre (324&nbsp;m à 571&nbsp;m), parsemé d&apos;étangs et
                parcouru par plusieurs ruisseaux. Le territoire a été formé par
                les moraines des glaciers quaternaires déposées sur un bloc
                molassique — ce qui explique le caractère «&nbsp;terres
                froides&nbsp;» et la difficulté à y cultiver la vigne.
              </p>
            </article>

            <article className="space-y-3">
              <h3 className="font-display text-xl font-semibold text-ink">
                Origines gallo-romaines
              </h3>
              <p className="text-ink-muted">
                L&apos;inventaire du patrimoine du Pays de Bourgoin-Jallieu
                (Conseil général, 2009) révèle des traces d&apos;occupation
                gallo-romaine sur le site. La commune dépendait du mandement de
                Châteauvilain, dirigé par la famille Vallin au Moyen Âge.
              </p>
            </article>

            <article className="space-y-3">
              <h3 className="font-display text-xl font-semibold text-ink">
                L&apos;église Saint-Pierre-aux-Liens et le prieuré
              </h3>
              <p className="text-ink-muted">
                Les premiers documents connus remontent au IXe siècle — dont un
                acte entre le chapitre Saint-Maurice de Vienne et le prieuré de
                Succieu. L&apos;église Saint-Pierre-aux-Liens était le point
                focal initial de la communauté. Le prieuré de Succieu, petit
                monastère rural rattaché à une abbaye plus grande, jouait un rôle
                central dans la vie religieuse et sociale du village.
              </p>
            </article>

            <article className="space-y-3">
              <h3 className="font-display text-xl font-semibold text-ink">
                Le château de Milliassière
              </h3>
              <p className="text-ink-muted">
                C&apos;est le grand patrimoine du village. Ancienne maison forte
                construite aux XIVe et XVe siècles sur une colline, entre le
                bourg et le hameau de Buffières.
              </p>
              <ul className="list-none space-y-2 border-l-2 border-border-subtle pl-4 text-ink-muted">
                <li>
                  <strong className="text-ink">1279</strong> — Les terres de
                  Buffières données à la famille Buffevent en reconnaissance des
                  Croisades.
                </li>
                <li>
                  <strong className="text-ink">1319</strong> — Jacquemet de
                  Buffevent, castellan du lieu.
                </li>
                <li>
                  <strong className="text-ink">XVe siècle</strong> — Construction
                  de la partie ancienne encore visible.
                </li>
                <li>
                  <strong className="text-ink">XVIIe siècle</strong> — Aspect
                  classique de maison forte avec deux tours en diagonale.
                </li>
                <li>
                  <strong className="text-ink">Années 1880</strong> —
                  Aménagement du parc à l&apos;anglaise, pièce d&apos;eau, grande
                  allée.
                </li>
                <li>
                  <strong className="text-ink">1913</strong> — Extension de
                  l&apos;aile nord (avec récupération de pierres de l&apos;ancienne
                  maison forte de Buffevent).
                </li>
              </ul>
              <p className="text-ink-muted">
                Aujourd&apos;hui propriété privée, le site accueille un festival
                de musique organisé depuis 2018 par l&apos;association Les Amis
                de Milliassière.
              </p>
            </article>
          </div>
        </Section>
      </div>
    </div>
  );
}
