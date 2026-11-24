"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/bureau/fields";
import { libellePriorite } from "@/lib/suivi/affichage";
import { AVANCEMENTS, PRIORITES } from "@/lib/suivi/types";
import type { Dossier, Listes } from "@/lib/suivi/types";
import { envoyer, messageErreur } from "./api";
import { btnGhost, btnPrimary, focus } from "./ui";

type Props = {
  mode: "creer" | "modifier";
  /** Comptes du hub proposés comme référents. */
  comptes: { id: string; nom: string }[];
  listes: Listes;
  dossier?: Dossier;
  referentParDefaut?: string;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const ctl = `block w-full rounded-xl border border-ink-subtle/60 bg-surface px-3.5 py-2.5 text-base ${focus}`;
const lab = "mt-4 block font-semibold";

function Choix({ id, valeur, options, vide, rendu }: { id: string; valeur: string; options: readonly string[]; vide: string; rendu?: (v: string) => string }) {
  const liste = valeur && !options.includes(valeur) ? [...options, valeur] : options;
  return (
    <select id={id} name={id} defaultValue={valeur} className={ctl}>
      <option value="">{vide}</option>
      {liste.map((o) => <option key={o} value={o}>{rendu ? rendu(o) : o}</option>)}
    </select>
  );
}

export function DossierForm({ mode, comptes, listes, dossier, referentParDefaut }: Props) {
  const router = useRouter();
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const refs = dossier?.referents ?? (referentParDefaut ? [referentParDefaut] : []);
  const echeance = dossier?.echeance ?? "";
  const avancementsModifiables = AVANCEMENTS.filter((a) => a !== "Terminé" && a !== "Abandonné");
  const terminal = dossier ? dossier.statut !== "actif" : false;
  const retour = dossier ? `/espace-bureau/bureau/dossier/${dossier.id}` : "/espace-bureau/bureau";

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnvoi(true);
    setErreur("");
    const f = new FormData(e.currentTarget);
    const t = (k: string) => String(f.get(k) ?? "");
    const corps: Record<string, unknown> = {
      titre: t("titre"),
      referents: f.getAll("referents").map(String),
      priorite: t("priorite"),
      prochaineAction: t("prochaineAction"),
      echeance: t("date") || t("precision"),
      commission: t("commission"),
      blocage: t("blocage"),
      decisionAttendue: t("decisionAttendue"),
      origine: t("origine"),
    };
    if (!terminal) corps.avancement = t("avancement");
    try {
      let d: Dossier;
      if (dossier) d = await envoyer<Dossier>(`/dossiers/${dossier.id}`, { ...corps, revision: dossier.revision }, "PATCH");
      else d = await envoyer<Dossier>("/dossiers", corps);
      router.push(`/espace-bureau/bureau/dossier/${d.id}`);
      router.refresh();
    } catch (err) {
      setErreur(messageErreur(err));
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="rounded-[1.25rem] border border-border-subtle bg-surface p-5 sm:p-7">
      <div role="alert">{erreur ? <Notice tone="error">{erreur}</Notice> : null}</div>
      <label htmlFor="titre" className="block font-semibold">Titre du dossier</label>
      <input id="titre" name="titre" type="text" required maxLength={200} defaultValue={dossier?.titre ?? ""} className={`${ctl} mt-1.5`} />

      <fieldset className="mt-4">
        <legend className="font-semibold">Qui s’en occupe ?</legend>
        <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
          {comptes.map((c) => (
            <label key={c.id} className="flex min-h-11 items-center gap-2.5">
              <input type="checkbox" name="referents" value={c.id} defaultChecked={refs.includes(c.id)} className="h-5 w-5 accent-[#1f5a26]" /> {c.nom}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor="priorite" className={lab}>Priorité</label>
      <Choix id="priorite" valeur={dossier?.priorite ?? ""} options={PRIORITES} vide="Pas de priorité" rendu={libellePriorite} />

      <label htmlFor="prochaineAction" className={lab}>Prochaine action</label>
      <textarea id="prochaineAction" name="prochaineAction" rows={3} maxLength={2000} defaultValue={dossier?.prochaineAction ?? ""} className={ctl} />

      <label htmlFor="date" className={lab}>Pour quand ? <span className="font-normal text-ink-muted">(choisir une date)</span></label>
      <input id="date" name="date" type="date" defaultValue={ISO.test(echeance) ? echeance : ""} className={ctl} />
      <label htmlFor="precision" className={lab}>ou une précision <span className="font-normal text-ink-muted">(par exemple : « Avril 2027 »)</span></label>
      <input id="precision" name="precision" type="text" maxLength={120} defaultValue={echeance && !ISO.test(echeance) ? echeance : ""} className={ctl} />

      <details className="mt-5 rounded-xl border border-border-subtle p-4" open={mode === "modifier"}>
        <summary className={`cursor-pointer font-semibold ${focus}`}>Plus de détails (facultatif)</summary>
        <label htmlFor="commission" className={lab}>Commission</label>
        <Choix id="commission" valeur={dossier?.commission ?? ""} options={listes.commissions} vide="Aucune" />
        {!terminal ? (
          <>
            <label htmlFor="avancement" className={lab}>Où en est-on ?</label>
            <Choix id="avancement" valeur={dossier?.avancement ?? ""} options={avancementsModifiables} vide="Pas précisé" />
          </>
        ) : null}
        <label htmlFor="blocage" className={lab}>Ce qui bloque</label>
        <Choix id="blocage" valeur={dossier?.blocage ?? ""} options={listes.blocages} vide="Pas précisé" />
        <label htmlFor="decisionAttendue" className={lab}>Décision attendue de</label>
        <Choix id="decisionAttendue" valeur={dossier?.decisionAttendue ?? ""} options={listes.decisionsAttendues} vide="Pas précisé" />
        <label htmlFor="origine" className={lab}>D’où vient ce dossier ?</label>
        <input id="origine" name="origine" type="text" maxLength={120} defaultValue={dossier?.origine ?? ""} className={ctl} />
      </details>

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="submit" disabled={envoi} className={btnPrimary}>{mode === "creer" ? "Créer le dossier" : "Enregistrer"}</button>
        <a className={btnGhost} href={retour}>Annuler</a>
      </div>
    </form>
  );
}
