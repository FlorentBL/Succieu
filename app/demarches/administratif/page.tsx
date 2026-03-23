import type { Metadata } from "next";
import { NoticeMairie } from "@/components/ui/NoticeMairie";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = {
  title: "Démarches administratives",
  description:
    "Passeport, carte d’identité et recensement — informations pour les habitants de Succieu.",
};

export default function AdministratifPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-moss-dark sm:text-4xl">
        Démarches administratives
      </h1>
      <p className="mt-3 text-lg text-ink-muted">
        Rappels issus de l’ancien site — vérifiez les listes de mairies habilitées
        sur service-public.fr.
      </p>

      <NoticeMairie>
        Liste des mairies pour passeport / CNI et modalités : toujours vérifier
        sur les sites officiels (ANTS, service-public).
      </NoticeMairie>

      <div className="mt-10 space-y-10 prose-site">
        <Section id="passeport" title="Passeport">
          <p className="text-ink-muted">
            Valable 10 ans (adultes), 5 ans (mineurs). Dépôt dans les mairies
            désignées : Bourgoin-Jallieu, Crémieu, L&apos;Isle-d&apos;Abeau, La
            Côte-Saint-André, La Tour-du-Pin (liste indicative — à actualiser).
          </p>
        </Section>
        <Section id="cni" title="Carte nationale d’identité">
          <p className="text-ink-muted">
            Valable 10 ans, gratuite. Démarches selon les mairies équipées.
          </p>
        </Section>
        <Section id="recensement" title="Recensement">
          <p className="text-ink-muted">
            Obligatoire dès 16 ans pour la Journée défense et citoyenneté (JDC).
          </p>
        </Section>
      </div>
    </div>
  );
}
