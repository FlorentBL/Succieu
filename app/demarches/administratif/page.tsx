import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Démarches administratives",
  description:
    "Passeport, carte d’identité et recensement — informations pour les habitants de Succieu.",
};

export default function AdministratifPage() {
  const u = siteConfig.urls;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Démarches administratives
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Démarches d’état civil : les modalités et la liste des mairies équipées
        évoluent — utilisez les sources officielles ci-dessous.
      </p>

      <Card className="mt-8">
        <p className="text-sm font-semibold text-ink">Sources officielles</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-muted">
          <li>
            <a
              href={u.servicePublic}
              className="font-medium text-sage-dark underline"
              rel="noopener noreferrer"
            >
              service-public.fr
            </a>{" "}
            — fiches par démarche
          </li>
          <li>
            <a
              href={u.franceTitres}
              className="font-medium text-sage-dark underline"
              rel="noopener noreferrer"
            >
              France Titres (ANTS)
            </a>{" "}
            — pré-demande en ligne, mairie équipée près de chez vous, rendez-vous
          </li>
          <li>
            <a
              href={u.antsGouv}
              className="font-medium text-sage-dark underline"
              rel="noopener noreferrer"
            >
              ants.gouv.fr
            </a>{" "}
            — informations sur les titres sécurisés
          </li>
        </ul>
      </Card>

      <div className="mt-10 space-y-10 prose-site">
        <Section id="passeport" title="Passeport">
          <p className="text-ink-muted">
            Valable 10 ans (adultes), 5 ans (mineurs). Dépôt dans une mairie
            équipée du dispositif de recueil (vous n’êtes pas obligé de le faire
            dans votre commune de résidence). Détail des pièces et délais :{" "}
            <a
              href={u.servicePublicPasseport}
              className="font-medium text-sage-dark underline"
              rel="noopener noreferrer"
            >
              service-public.fr — Passeport
            </a>
            . Pré-demande et recherche d’une mairie :{" "}
            <a
              href={u.franceTitres}
              className="font-medium text-sage-dark underline"
              rel="noopener noreferrer"
            >
              France Titres
            </a>
            .
          </p>
        </Section>
        <Section id="cni" title="Carte nationale d’identité">
          <p className="text-ink-muted">
            Valable 10 ans, gratuite. Même principe que pour le passeport (mairie
            équipée, pré-demande). Fiche démarche :{" "}
            <a
              href={u.servicePublicCni}
              className="font-medium text-sage-dark underline"
              rel="noopener noreferrer"
            >
              service-public.fr — Carte d’identité
            </a>
            .
          </p>
        </Section>
        <Section id="recensement" title="Recensement">
          <p className="text-ink-muted">
            Obligatoire dès 16 ans pour la Journée défense et citoyenneté (JDC).
            Informations :{" "}
            <a
              href={u.servicePublicRecensement}
              className="font-medium text-sage-dark underline"
              rel="noopener noreferrer"
            >
              service-public.fr — Recensement militaire
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
