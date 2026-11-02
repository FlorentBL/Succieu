"use client";

import { useRef, useState } from "react";
import { AppError } from "@/lib/content/errors";
import { LIMITS, parseArticleFields, parseEventFields } from "@/lib/content/validation";
import type { Submission, SubmissionKind } from "@/lib/content/types";
import { ApiError, postSubmission, uploadImage } from "./api";
import { Button, Notice, TextArea, TextField, focusRing } from "./fields";

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });

type Errors = Record<string, string>;

/** Validation client = fonctions du serveur ; retourne les erreurs par champ. */
function check(kind: SubmissionKind, values: Record<string, string>): Errors {
  try {
    if (kind === "article") parseArticleFields(values);
    else parseEventFields(values);
    return {};
  } catch (e) {
    if (e instanceof AppError && e.fields) return e.fields;
    throw e;
  }
}

const SUCCESS = "Votre saisie est transmise pour relecture puis validation.";

function useSubmit(kind: SubmissionKind, onDone: (s: Submission) => void) {
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const summaryRef = useRef<HTMLDivElement>(null);

  async function send(values: Record<string, string>, extra?: () => Promise<Record<string, string>>) {
    setMessage("");
    const local = check(kind, values);
    if (Object.keys(local).length) {
      setErrors(local);
      setState("error");
      setMessage("Certains champs sont à corriger.");
      queueMicrotask(() => {
        const first = Object.keys(local)[0];
        document.getElementById(`${kind}-${first}`)?.focus();
      });
      return;
    }
    setErrors({});
    setState("sending");
    try {
      const fields = extra ? { ...values, ...(await extra()) } : values;
      const sub = await postSubmission(kind, fields);
      setState("done");
      setMessage(SUCCESS);
      onDone(sub);
      queueMicrotask(() => summaryRef.current?.focus());
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      if (err?.fields) setErrors(err.fields);
      setState("error");
      setMessage(
        err?.code === "unauthorized"
          ? "Votre session a expiré : reconnectez-vous puis renvoyez votre saisie."
          : (err?.message ?? "L’envoi a échoué. Réessayez."),
      );
    }
  }
  return { errors, state, message, send, summaryRef, reset: () => { setState("idle"); setMessage(""); setErrors({}); } };
}

function Result({
  state,
  message,
  summaryRef,
  onAgain,
}: {
  state: string;
  message: string;
  summaryRef: React.RefObject<HTMLDivElement | null>;
  onAgain: () => void;
}) {
  if (state === "done") {
    return (
      <div ref={summaryRef} tabIndex={-1} className="outline-none">
        <Notice tone="success">
          <p className="font-semibold">{message}</p>
          <p className="mt-1 text-ink-muted">Vous pouvez suivre son avancement dans l’historique ci-dessous.</p>
          <Button type="button" variant="ghost" className="mt-3 !min-h-11" onClick={onAgain}>
            Faire une autre saisie
          </Button>
        </Notice>
      </div>
    );
  }
  if (state === "error" && message) return <Notice tone="error">{message}</Notice>;
  return null;
}

export function ArticleForm({ onDone }: { onDone: (s: Submission) => void }) {
  const empty = { title: "", summary: "", body: "", linkUrl: "", linkLabel: "", publishedAt: today() };
  const [v, setV] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const { errors, state, message, send, summaryRef, reset } = useSubmit("article", onDone);
  const set = (k: keyof typeof empty) => (val: string) => setV((p) => ({ ...p, [k]: val }));
  const e: Errors = { ...errors, ...(fileError ? { image: fileError } : {}) };

  function pickFile(f: File | null) {
    setFileError("");
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
      setFileError("Image : formats acceptés jpeg, png ou webp.");
      setFile(null);
      setPreview(null);
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setFileError("Image : 3 Mo maximum.");
      setFile(null);
      setPreview(null);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearAll() {
    setV({ ...empty, publishedAt: today() });
    pickFile(null);
    if (fileInput.current) fileInput.current.value = "";
    reset();
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (state === "sending" || fileError) return;
        void send(v, file ? async () => ({ image: (await uploadImage(file)).image }) : undefined);
      }}
    >
      <TextField id="article-title" label="Titre" value={v.title} onChange={set("title")} error={e.title}
        hint={`${LIMITS.title} caractères maximum`} />
      <TextArea id="article-summary" label="Texte court du carrousel" value={v.summary} onChange={set("summary")}
        error={e.summary} max={LIMITS.summary} rows={3} counter
        hint="Affiché à l’accueil : deux ou trois phrases suffisent." />
      <TextArea id="article-body" label="Texte complet" value={v.body} onChange={set("body")} error={e.body}
        max={LIMITS.body} rows={8} counter />
      <TextField id="article-publishedAt" label="Date de publication" type="date" value={v.publishedAt}
        onChange={set("publishedAt")} error={e.publishedAt} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="article-linkUrl" label="Lien" optional value={v.linkUrl} onChange={set("linkUrl")}
          error={e.linkUrl} hint="Adresse https://… ou chemin du site (/contact)" />
        <TextField id="article-linkLabel" label="Libellé du lien" optional value={v.linkLabel}
          onChange={set("linkLabel")} error={e.linkLabel} hint={`${LIMITS.linkLabel} caractères maximum`} />
      </div>
      <div>
        <label htmlFor="article-image" className="block text-[0.95rem] font-semibold text-ink">
          Image <span className="font-normal text-ink-muted">(facultatif)</span>
        </label>
        <p id="article-image-hint" className="mt-0.5 text-sm text-ink-muted">jpeg, png ou webp, 3 Mo maximum.</p>
        <input
          ref={fileInput}
          id="article-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(ev) => pickFile(ev.target.files?.[0] ?? null)}
          aria-invalid={e.image ? true : undefined}
          aria-describedby={`article-image-hint${e.image ? " article-image-err" : ""}`}
          className={`mt-1.5 block w-full rounded-xl border border-ink-subtle/60 bg-surface p-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-pre-pale file:px-4 file:py-2 file:font-semibold file:text-moss-dark ${focusRing}`}
        />
        {e.image ? (
          <p id="article-image-err" className="mt-1.5 text-sm font-medium" style={{ color: "#9c3a22" }}>{e.image}</p>
        ) : null}
        {preview ? (
          <div className="mt-3 flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Aperçu de l’image choisie" className="h-28 w-40 rounded-xl border border-border-subtle object-cover" />
            <Button type="button" variant="ghost" className="!min-h-10 !px-4 text-sm" onClick={() => { pickFile(null); if (fileInput.current) fileInput.current.value = ""; }}>
              Retirer l’image
            </Button>
          </div>
        ) : null}
      </div>
      <Result state={state} message={message} summaryRef={summaryRef} onAgain={clearAll} />
      {state !== "done" ? (
        <Button type="submit" disabled={state === "sending"} className="w-full sm:w-auto">
          {state === "sending" ? "Envoi en cours…" : "Envoyer pour relecture"}
        </Button>
      ) : null}
    </form>
  );
}

export function EventForm({ onDone }: { onDone: (s: Submission) => void }) {
  const empty = { title: "", date: "", startTime: "", endTime: "", place: "", description: "", linkUrl: "" };
  const [v, setV] = useState(empty);
  const { errors: e, state, message, send, summaryRef, reset } = useSubmit("event", onDone);
  const set = (k: keyof typeof empty) => (val: string) => setV((p) => ({ ...p, [k]: val }));
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (state === "sending") return;
        void send(v);
      }}
    >
      <TextField id="event-title" label="Titre" value={v.title} onChange={set("title")} error={e.title}
        hint={`${LIMITS.title} caractères maximum`} />
      <TextField id="event-date" label="Date" type="date" value={v.date} onChange={set("date")} error={e.date} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField id="event-startTime" label="Heure de début" type="time" optional value={v.startTime}
          onChange={set("startTime")} error={e.startTime} />
        <TextField id="event-endTime" label="Heure de fin" type="time" optional value={v.endTime}
          onChange={set("endTime")} error={e.endTime} />
      </div>
      <TextField id="event-place" label="Lieu" value={v.place} onChange={set("place")} error={e.place} />
      <TextArea id="event-description" label="Description" value={v.description} onChange={set("description")}
        error={e.description} max={LIMITS.description} rows={5} counter />
      <TextField id="event-linkUrl" label="Lien" optional value={v.linkUrl} onChange={set("linkUrl")}
        error={e.linkUrl} hint="Adresse https://… ou chemin du site (/contact)" />
      <Result state={state} message={message} summaryRef={summaryRef}
        onAgain={() => { setV(empty); reset(); }} />
      {state !== "done" ? (
        <Button type="submit" disabled={state === "sending"} className="w-full sm:w-auto">
          {state === "sending" ? "Envoi en cours…" : "Envoyer pour relecture"}
        </Button>
      ) : null}
    </form>
  );
}
