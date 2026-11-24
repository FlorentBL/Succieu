import Link from "next/link";
import { DossierActions } from "@/components/suivi/DossierActions";
import { btnGhost, Pastille } from "@/components/suivi/ui";
import { requireModulePage } from "@/lib/hub/page-guards";
import { aujourdhui, dateHeure, enRetard, libellePriorite, niveauPriorite, echeanceAffichage, referentsAffichage } from "@/lib/suivi/affichage";
import { lireNoms, readData } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

function Champ({ nom, valeur }: { nom: string; valeur: string }) {
  return (
    <div className="grid gap-0.5 border-b border-border-subtle py-2.5 sm:grid-cols-[14rem_1fr] sm:gap-4">
      <dt className="font-semibold">{nom}</dt>
      <dd className={valeur ? "" : "text-ink-subtle"}>{valeur || "Non renseigné"}</dd>
    </div>
  );
}

export default async function DetailDossier({ params }: { params: Promise<{ id: string }> }) {
  const { level } = await requireModulePage("espace-bureau");
  const { id } = await params;
  const [data, { noms }] = await Promise.all([readData(), lireNoms()]);
  const d = data.dossiers.find((x) => x.id === id);
  if (!d) {
    return (
      <>
        <h2 className="text-2xl font-bold">Dossier introuvable</h2>
        <Link href="/espace-bureau/bureau" className={`${btnGhost} mt-4`}>Retour aux dossiers</Link>
      </>
    );
  }
  const niveau = niveauPriorite(d.priorite);
  const nouvelles = [...d.nouvelles].reverse();
  return (
    <>
      <p className="mb-2"><Link href="/espace-bureau/bureau" className="font-semibold text-moss-dark underline">← Retour aux dossiers</Link></p>
      <h2 className="text-2xl font-bold leading-tight">{d.titre}</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {niveau !== "aucun" ? <Pastille type={niveau}>{libellePriorite(d.priorite)}</Pastille> : null}
        {enRetard(d, aujourdhui()) ? <Pastille type="retard">En retard</Pastille> : null}
        {d.aVoirEnBureau ? <Pastille type="bureau">À voir en bureau</Pastille> : null}
        {d.statut === "termine" ? <Pastille type="programme">Terminé</Pastille> : null}
        {d.statut === "abandonne" ? <Pastille type="programme">Abandonné</Pastille> : null}
      </div>

      {level === "write" ? <DossierActions id={d.id} statut={d.statut} aVoirEnBureau={d.aVoirEnBureau} /> : null}

      <h3 className="mt-7 text-xl font-bold">Le dossier</h3>
      <dl className="mt-2 rounded-xl border border-border-subtle bg-surface px-4">
        <Champ nom={referentsAffichage(d, noms)?.label ?? "Référent"} valeur={referentsAffichage(d, noms)?.texte ?? ""} />
        <Champ nom="Commission" valeur={d.commission} />
        <Champ nom="Priorité" valeur={libellePriorite(d.priorite)} />
        <Champ nom="Où en est-on ?" valeur={d.statut === "actif" ? d.avancement : ""} />
        <Champ nom="Ce qui bloque" valeur={d.blocage} />
        <Champ nom="Décision attendue de" valeur={d.decisionAttendue} />
        <Champ nom="Prochaine action" valeur={d.prochaineAction} />
        <Champ nom={echeanceAffichage(d.echeance)?.nom ?? "Échéance"} valeur={echeanceAffichage(d.echeance)?.valeur ?? ""} />
        <Champ nom="D’où vient ce dossier ?" valeur={d.origine} />
      </dl>
      {level === "write" ? <div className="mt-3 print:hidden"><Link href={`/espace-bureau/bureau/dossier/${d.id}/modifier`} className={btnGhost}>Modifier ce dossier</Link></div> : null}

      <h3 className="mt-7 text-xl font-bold">Les nouvelles</h3>
      {nouvelles.length === 0 ? (
        <p className="mt-2 text-ink-muted">Pas encore de nouvelle.</p>
      ) : (
        <ul className="mt-2 grid gap-3">
          {nouvelles.map((n) => (
            <li key={n.id} className="rounded-xl border border-border-subtle bg-surface p-4">
              <p className="text-sm font-semibold text-ink-muted">{dateHeure(n.date)} — {n.auteur}</p>
              <p className="mt-1 whitespace-pre-line">{n.texte}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
