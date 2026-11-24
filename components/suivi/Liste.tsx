import Link from "next/link";
import { aujourdhui, dateLongue, enRetard, libellePriorite, niveauPriorite, nomsReferents } from "@/lib/suivi/affichage";
import type { NiveauPriorite } from "@/lib/suivi/affichage";
import { PRIORITES } from "@/lib/suivi/types";
import type { Dossier, Listes, Noms } from "@/lib/suivi/types";
import { btnGhost, btnPrimary, focus, LISERE, Pastille } from "./ui";

export const BASE = "/espace-bureau/bureau";

export type Recherche = { commission?: string; priorite?: string; q?: string };

export function lireRecherche(sp: Record<string, string | string[] | undefined>): Recherche {
  const un = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return { commission: un("commission"), priorite: un("priorite"), q: un("q") };
}

export function appliquerPriorite(dossiers: Dossier[], priorite?: string): Dossier[] {
  return priorite ? dossiers.filter((d) => d.priorite === priorite) : dossiers;
}

/** Rappel en clair des filtres actifs, pour la ligne « N dossiers ». */
export function resumeFiltres(r: Recherche): string {
  return [r.q ? `« ${r.q} »` : "", r.commission ?? "", r.priorite ? libellePriorite(r.priorite) : ""].filter(Boolean).join(" · ");
}

const champ = `block w-full rounded-xl border border-ink-subtle/60 bg-surface px-3.5 py-2.5 text-base text-ink ${focus}`;

/**
 * Recherche toujours visible ; commission et priorité repliées dans « Filtrer » (<details> : marche sans JavaScript).
 * Formulaire GET : l'adresse reste partageable et un rechargement garde la recherche.
 */
export function Filtres({ listes, action, valeurs, cache }: { listes: Listes; action: string; valeurs: Recherche; cache?: Record<string, string> }) {
  const actifs = [valeurs.commission, valeurs.priorite].filter(Boolean).length;
  return (
    <form method="get" action={action} role="search" className="print:hidden">
      {cache ? Object.entries(cache).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${champ} min-w-0 flex-1 basis-56`} type="search" name="q" enterKeyHint="search" placeholder="Chercher un mot" aria-label="Chercher un mot" defaultValue={valeurs.q ?? ""} />
        <button type="submit" className={btnPrimary}>Chercher</button>
      </div>
      <details className="mt-2" open={actifs > 0}>
        <summary className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border border-ink-subtle/40 bg-surface px-4 font-semibold ${focus}`}>
          Filtrer{actifs ? <span className="ml-2 rounded-full bg-moss-dark px-2 text-sm text-white" aria-label={`${actifs} filtre${actifs > 1 ? "s" : ""} actif${actifs > 1 ? "s" : ""}`}>{actifs}</span> : null}
        </summary>
        <div className="mt-2 grid gap-3 rounded-xl border border-border-subtle bg-surface p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="f-commission" className="mb-1 block text-[0.95rem] font-semibold">Commission</label>
            <select id="f-commission" name="commission" defaultValue={valeurs.commission ?? ""} className={champ}>
              <option value="">Toutes</option>
              {listes.commissions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-priorite" className="mb-1 block text-[0.95rem] font-semibold">Priorité</label>
            <select id="f-priorite" name="priorite" defaultValue={valeurs.priorite ?? ""} className={champ}>
              <option value="">Toutes</option>
              {PRIORITES.map((p) => <option key={p} value={p}>{libellePriorite(p)}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className={btnPrimary}>Appliquer</button>
            <a href={action} className={btnGhost}>Tout afficher</a>
          </div>
        </div>
      </details>
    </form>
  );
}

/** « Mes dossiers / Tous » : deux liens, sans JavaScript. */
export function Segment({ actif, nb, nbTous, liens = { mes: BASE, tous: `${BASE}/tous` } }: { actif: "mes" | "tous"; nb: number; nbTous: number; liens?: { mes: string; tous: string } }) {
  const cls = (a: boolean) => `inline-flex min-h-11 items-center gap-2 px-4 text-[0.95rem] font-semibold ${focus} ${a ? "bg-moss-dark text-white" : "bg-surface text-ink hover:bg-pre-pale"}`;
  return (
    <div role="group" aria-label="Quels dossiers ?" className="inline-flex overflow-hidden rounded-full border border-ink-subtle/50 print:hidden">
      <Link href={liens.mes} aria-current={actif === "mes" ? "page" : undefined} className={cls(actif === "mes")}>Mes dossiers <span className="tabular-nums">({nb})</span></Link>
      <Link href={liens.tous} aria-current={actif === "tous" ? "page" : undefined} className={cls(actif === "tous")}>Tous <span className="tabular-nums">({nbTous})</span></Link>
    </div>
  );
}

/** Une carte par dossier : seuls les champs renseignés sont affichés. */
export function CarteDossier({ d, noms, today, sansPriorite = false }: { d: Dossier; noms: Noms; today: string; sansPriorite?: boolean }) {
  const niveau = niveauPriorite(d.priorite);
  const refs = nomsReferents(d, noms);
  const retard = enRetard(d, today);
  const pastilles = (niveau !== "aucun" && !sansPriorite) || retard || d.aVoirEnBureau;
  return (
    <li className={`rounded-xl border border-border-subtle bg-surface p-4 shadow-sm ${LISERE[niveau]}`}>
      {pastilles ? (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {niveau !== "aucun" && !sansPriorite ? <Pastille type={niveau}>{libellePriorite(d.priorite)}</Pastille> : null}
          {retard ? <Pastille type="retard">En retard</Pastille> : null}
          {d.aVoirEnBureau ? <Pastille type="bureau">À voir en bureau</Pastille> : null}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold leading-snug">
        <Link href={`${BASE}/dossier/${d.id}`} className={`underline-offset-2 hover:underline ${focus}`}>{d.titre}</Link>
      </h3>
      {refs || d.echeance ? (
        <p className="mt-1 text-[0.95rem] text-ink-muted">
          {refs ? `Référent : ${refs}` : ""}{refs && d.echeance ? " · " : ""}{d.echeance ? `Pour le ${dateLongue(d.echeance)}` : ""}
        </p>
      ) : null}
      {d.prochaineAction ? <p className="mt-1 text-[0.95rem]"><span className="font-semibold">Prochaine action :</span> {d.prochaineAction}</p> : null}
    </li>
  );
}

const GROUPES: { niveau: NiveauPriorite; titre: string }[] = [
  { niveau: "urgent", titre: "Urgent" },
  { niveau: "important", titre: "Important" },
  { niveau: "programme", titre: "À programmer" },
  { niveau: "aucun", titre: "Sans priorité" },
];

/** Dossiers regroupés par priorité (intertitre avec le nombre), ou à plat si `grouper` est faux. */
export function ListeDossiers({ dossiers, noms, vide, grouper = true, resume }: { dossiers: Dossier[]; noms: Noms; vide: string; grouper?: boolean; resume?: string }) {
  const today = aujourdhui();
  if (!dossiers.length) return <p className="rounded-xl border border-border-subtle bg-surface p-5 text-ink-muted">{vide}</p>;
  const carte = (d: Dossier) => <CarteDossier key={d.id} d={d} noms={noms} today={today} sansPriorite={grouper} />;
  return (
    <>
      <p className="text-[0.95rem] text-ink-muted" aria-live="polite">{dossiers.length} dossier{dossiers.length > 1 ? "s" : ""}{resume ? ` · ${resume}` : ""}</p>
      {grouper ? (
        GROUPES.map((g) => {
          const items = dossiers.filter((d) => niveauPriorite(d.priorite) === g.niveau);
          if (!items.length) return null;
          return (
            <section key={g.niveau} className="mt-5" aria-labelledby={`g-${g.niveau}`}>
              <h2 id={`g-${g.niveau}`} className="mb-2 text-xl font-bold">{g.titre} ({items.length})</h2>
              <ul className="grid gap-3">{items.map(carte)}</ul>
            </section>
          );
        })
      ) : (
        <ul className="mt-3 grid gap-3">{dossiers.map(carte)}</ul>
      )}
    </>
  );
}
