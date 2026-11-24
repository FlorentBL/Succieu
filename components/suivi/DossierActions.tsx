"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/bureau/fields";
import { envoyer, messageErreur } from "./api";
import { btnGhost, btnPrimary, focus } from "./ui";

type Props = { id: string; statut: "actif" | "termine" | "abandonne"; aVoirEnBureau: boolean };

export function DossierActions({ id, statut, aVoirEnBureau }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"" | "nouvelle" | "fait">("");
  const [texte, setTexte] = useState("");
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [occupe, setOccupe] = useState(false);

  async function agir(url: string, body: unknown, message: string, apres?: () => void) {
    setOccupe(true);
    setErreur("");
    setInfo("");
    try {
      await envoyer(`/dossiers/${id}/${url}`, body);
      setInfo(message);
      setMode("");
      apres?.();
      router.refresh();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setOccupe(false);
    }
  }

  const actif = statut === "actif";
  return (
    <section aria-label="Actions" className="print:hidden">
      <div className="space-y-2" aria-live="polite">
        {erreur ? <Notice tone="error">{erreur}</Notice> : null}
        {info ? <Notice tone="success">{info}</Notice> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={() => setMode(mode === "nouvelle" ? "" : "nouvelle")} aria-expanded={mode === "nouvelle"}>
          Ajouter une nouvelle
        </button>
        {actif ? (
          <button type="button" className={btnGhost} onClick={() => setMode("fait")} aria-expanded={mode === "fait"}>C’est fait</button>
        ) : (
          <button type="button" className={btnPrimary} disabled={occupe} onClick={() => agir("rouvrir", {}, "Le dossier est de nouveau en cours.")}>Rouvrir ce dossier</button>
        )}
        {actif ? (
          <button
            type="button"
            className={btnGhost}
            aria-pressed={aVoirEnBureau}
            disabled={occupe}
            onClick={() => agir("bureau", { valeur: !aVoirEnBureau }, aVoirEnBureau ? "Ce dossier n’est plus à voir en bureau." : "Ce dossier sera vu à la prochaine réunion du bureau.")}
          >
            {aVoirEnBureau ? "✓ À voir en bureau (retirer)" : "À voir en bureau"}
          </button>
        ) : null}
      </div>

      {mode === "nouvelle" ? (
        <form
          className="mt-4 rounded-xl border border-border-subtle bg-surface p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void agir("nouvelles", { texte }, "Votre nouvelle est ajoutée.", () => setTexte(""));
          }}
        >
          <label htmlFor="nouvelle-texte" className="block font-semibold">Votre nouvelle</label>
          <textarea
            id="nouvelle-texte"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            required
            rows={4}
            maxLength={4000}
            autoFocus
            className={`mt-1.5 block w-full rounded-xl border border-ink-subtle/60 bg-surface px-3.5 py-3 text-base ${focus}`}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary} disabled={occupe || !texte.trim()}>Enregistrer la nouvelle</button>
            <button type="button" className={btnGhost} onClick={() => setMode("")}>Annuler</button>
          </div>
        </form>
      ) : null}

      {mode === "fait" ? (
        <div className="mt-4 rounded-xl border border-colza bg-colza-pale p-4" role="alertdialog" aria-labelledby="conf-titre">
          <p id="conf-titre" className="font-semibold">Ce dossier est-il vraiment terminé ?</p>
          <p className="mt-1">Il sera rangé dans « Dossiers terminés ». Vous pourrez le rouvrir.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={occupe} onClick={() => agir("clore", {}, "Dossier terminé. Vous pouvez l’annuler avec « Rouvrir ce dossier ».")}>Oui, c’est fait</button>
            <button type="button" className={btnGhost} onClick={() => setMode("")}>Non, annuler</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
