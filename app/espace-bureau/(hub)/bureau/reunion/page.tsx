import Link from "next/link";
import { PrintButton } from "@/components/suivi/PrintButton";
import { Pastille } from "@/components/suivi/ui";
import { requireModulePage } from "@/lib/hub/page-guards";
import { aujourdhui, dateLongue, enRetard, libellePriorite, niveauPriorite, echeanceAffichage, referentsAffichage, ordreDuJour } from "@/lib/suivi/affichage";
import { lireNoms, readData } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

export default async function Reunion() {
  await requireModulePage("espace-bureau");
  const [data, { noms }] = await Promise.all([readData(), lireNoms()]);
  const points = ordreDuJour(data.dossiers);
  const today = aujourdhui();
  return (
    <div>
      {/* Impression A4 : on masque l'en-tête, la navigation et le pied du site. */}
      <style>{`@media print { header, footer, nav { display: none !important; } @page { size: A4; margin: 15mm; } }`}</style>
      <h2 className="text-2xl font-bold">Prochaine réunion du bureau</h2>
      <p className="hidden print:block">Ordre du jour — mairie de Succieu — édité le {dateLongue(today)}</p>
      <p className="mb-3 mt-1 text-ink-muted print:hidden">Les dossiers marqués « À voir en bureau » et les dossiers urgents. Cette page s’imprime sur une feuille A4.</p>
      <div className="mb-4 print:hidden"><PrintButton /></div>
      {points.length === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface p-5 text-ink-muted">Rien à l’ordre du jour : aucun dossier n’est marqué « À voir en bureau » ni urgent.</p>
      ) : (
        <ol className="grid gap-3">
          {points.map((d, i) => {
            const refs = referentsAffichage(d, noms);
            const ech = echeanceAffichage(d.echeance);
            const niveau = niveauPriorite(d.priorite);
            const derniere = d.nouvelles.at(-1);
            return (
              <li key={d.id} className="break-inside-avoid rounded-xl border border-border-subtle bg-surface p-4">
                <h3 className="text-lg font-semibold">{i + 1}. {d.titre}</h3>
                <div className="my-1.5 flex flex-wrap gap-1.5">
                  {niveau !== "aucun" ? <Pastille type={niveau}>{libellePriorite(d.priorite)}</Pastille> : null}
                  {enRetard(d, today) ? <Pastille type="retard">En retard</Pastille> : null}
                  {d.aVoirEnBureau ? <Pastille type="bureau">À voir en bureau</Pastille> : null}
                </div>
                {refs ? <p><strong>{refs.label} : </strong>{refs.texte}</p> : null}
                {d.decisionAttendue ? <p><strong>Décision attendue de : </strong>{d.decisionAttendue}</p> : null}
                {d.blocage && d.blocage !== "Aucun" ? <p><strong>Ce qui bloque : </strong>{d.blocage}</p> : null}
                {d.prochaineAction ? <p><strong>Prochaine action : </strong>{d.prochaineAction}</p> : null}
                {ech ? <p><strong>{ech.nom} : </strong>{ech.valeur}</p> : null}
                {derniere ? <p><strong>Dernière nouvelle : </strong>{derniere.texte}</p> : null}
                <p className="mt-1 print:hidden"><Link href={`/espace-bureau/bureau/dossier/${d.id}`} className="font-semibold text-moss-dark underline">Ouvrir le dossier</Link></p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
