"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Notice } from "@/components/bureau/fields";
import { dateLongue, libellePriorite, niveauPriorite } from "@/lib/suivi/affichage";
import { COLONNES, avancementDe, colonneDe, regrouper } from "@/lib/suivi/tableau";
import type { Colonne } from "@/lib/suivi/tableau";
import { ApiError, envoyer, messageErreur } from "./api";
import { btn, btnGhost, focus, LISERE, Pastille } from "./ui";

export type CarteTableau = {
  id: string;
  titre: string;
  priorite: string;
  avancement: string;
  echeance: string;
  referents: string;
  retard: boolean;
  aVoirEnBureau: boolean;
  revision: number;
};

type Retour = { type: "ok" | "erreur"; texte: string };

/**
 * Vue Kanban. Changer d'étape : bouton « Changer d'étape » sur chaque carte → liste de gros boutons (toujours disponible).
 * Ordinateur : glisser-déposer en plus (HTML5, sans bibliothèque), même appel PATCH avec `revision`.
 * Téléphone : une colonne à la fois, choisie par des pastilles avec compteurs.
 * `lecture` : lecture seule, ni bouton ni glisser-déposer.
 */
export function Tableau({ cartes: initiales, lecture = false }: { cartes: CarteTableau[]; lecture?: boolean }) {
  const router = useRouter();
  const [cartes, setCartes] = useState(initiales);
  const [choix, setChoix] = useState<CarteTableau | null>(null);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [survol, setSurvol] = useState<Colonne | null>(null);
  const groupes = regrouper(cartes);
  const [actif, setActif] = useState<Colonne>(() => COLONNES.find((c) => regrouper(initiales)[c].length) ?? "À trier");
  const declencheur = useRef<HTMLElement | null>(null);

  // Rechargement serveur (filtres, 409) : repartir des données fraîches.
  useEffect(() => setCartes(initiales), [initiales]);

  async function deplacer(carte: CarteTableau, vers: Colonne) {
    if (lecture || colonneDe(carte) === vers || occupe) return;
    setOccupe(true);
    setRetour(null);
    try {
      const d = await envoyer<{ avancement: string; revision: number }>(`/dossiers/${carte.id}`, { avancement: avancementDe(vers), revision: carte.revision }, "PATCH");
      setCartes((cs) => cs.map((c) => (c.id === carte.id ? { ...c, avancement: d.avancement, revision: d.revision } : c)));
      setRetour({ type: "ok", texte: `« ${carte.titre} » est maintenant dans « ${vers} ».` });
      setActif(vers);
      router.refresh();
    } catch (e) {
      setRetour({ type: "erreur", texte: messageErreur(e) });
      if (e instanceof ApiError && e.status === 409) router.refresh();
    } finally {
      setOccupe(false);
      setChoix(null);
    }
  }

  function fermer() {
    setChoix(null);
    declencheur.current?.focus();
  }

  return (
    <div className="mt-3">
      <div aria-live="polite" role="status">
        {retour ? <Notice tone={retour.type === "ok" ? "success" : "error"}>{retour.texte}</Notice> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 lg:hidden" role="group" aria-label="Choisir une étape">
        {COLONNES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={c === actif}
            onClick={() => setActif(c)}
            className={`${btn} border ${c === actif ? "border-moss-dark bg-moss-dark text-white" : "border-ink-subtle/50 bg-surface text-ink"}`}
          >
            {c} <span className="tabular-nums">({groupes[c].length})</span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {COLONNES.map((c, ci) => (
          <section
            key={c}
            className={`${c === actif ? "" : "hidden"} min-w-0 rounded-xl border p-2.5 lg:block ${survol === c ? "border-moss-dark bg-pre-pale" : "border-border-subtle bg-canvas"}`}
            aria-labelledby={`col-${ci}`}
            onDragOver={(e) => {
              if (!lecture && e.dataTransfer.types.includes("text/x-dossier")) {
                e.preventDefault();
                setSurvol(c);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setSurvol(null);
              const carte = cartes.find((x) => x.id === e.dataTransfer.getData("text/x-dossier"));
              if (carte) void deplacer(carte, c);
            }}
          >
            <h2 id={`col-${ci}`} className="mb-2 text-lg font-bold">
              {c} <span className="tabular-nums text-ink-muted" aria-label={`${groupes[c].length} dossier${groupes[c].length > 1 ? "s" : ""}`}>({groupes[c].length})</span>
            </h2>
            {groupes[c].length ? (
              <ul className="grid gap-2.5">
                {groupes[c].map((d) => {
                  const niveau = niveauPriorite(d.priorite);
                  return (
                    <li key={d.id} className={`rounded-lg border border-border-subtle bg-surface p-3 ${LISERE[niveau]}`} draggable={!lecture && !occupe} onDragStart={(e) => e.dataTransfer.setData("text/x-dossier", d.id)}>
                      <div className="mb-1 flex flex-wrap gap-1">
                        {niveau !== "aucun" ? <Pastille type={niveau}>{libellePriorite(d.priorite)}</Pastille> : null}
                        {d.retard ? <Pastille type="retard">En retard</Pastille> : null}
                        {d.aVoirEnBureau ? <Pastille type="bureau">À voir en bureau</Pastille> : null}
                      </div>
                      <h3 className="font-semibold leading-snug">
                        <Link href={`/espace-bureau/bureau/dossier/${d.id}`} className={`underline-offset-2 hover:underline ${focus}`}>{d.titre}</Link>
                      </h3>
                      {d.referents || d.echeance ? (
                        <p className="mt-1 text-sm text-ink-muted">
                          {d.referents ? `Référent : ${d.referents}` : ""}{d.referents && d.echeance ? " · " : ""}{d.echeance ? `Pour le ${dateLongue(d.echeance)}` : ""}
                        </p>
                      ) : null}
                      {lecture ? null : (
                        <button
                          type="button"
                          className={`${btnGhost} mt-2 min-h-11 w-full text-[0.95rem]`}
                          aria-label={`Changer d’étape : ${d.titre}`}
                          onClick={(e) => {
                            declencheur.current = e.currentTarget;
                            setChoix(d);
                          }}
                        >
                          Changer d’étape
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">Aucun dossier ici.</p>
            )}
          </section>
        ))}
      </div>

      {choix ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-3 sm:items-center" onClick={fermer}>
          <div
            className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="choix-titre"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") fermer();
            }}
          >
            <h2 id="choix-titre" className="text-lg font-bold">Où mettre « {choix.titre} » ?</h2>
            <div className="mt-3 grid gap-2">
              {COLONNES.map((c, i) => {
                const ici = colonneDe(choix) === c;
                return (
                  <button key={c} type="button" className={`${btn} ${ici ? "border border-ink-subtle/50 bg-surface text-ink" : "bg-moss-dark text-white hover:bg-moss"}`} disabled={ici || occupe} autoFocus={i === 0 || undefined} onClick={() => void deplacer(choix, c)}>
                    {c}{ici ? " (étape actuelle)" : ""}
                  </button>
                );
              })}
              <button type="button" className={btnGhost} onClick={fermer}>Annuler</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
