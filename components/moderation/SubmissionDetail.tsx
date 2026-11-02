"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  ArticleFields,
  ContentFields,
  EventFields,
  Submission,
} from "@/lib/content/types";
import {
  ACTION_LABEL,
  api,
  ApiError,
  FIELD_LABELS,
  FIELD_ORDER,
  fieldValue,
  formatDateTime,
  formatDay,
  KIND_LABEL,
  wordDiff,
  type DiffPart,
} from "@/lib/moderation";
import { StatusBadge } from "./ModerationList";
import { btnDanger, btnPrimary, btnSecondary } from "./ui";

type Pending = "original" | "corrected" | "reject" | null;

export function SubmissionDetail({ id }: { id: string }) {
  const [sub, setSub] = useState<Submission | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ submission: Submission }>(`/api/admin/submissions/${encodeURIComponent(id)}`);
      setSub(r.submission);
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setMissing(true);
      else setError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <p>
        <Link
          href="/espace-bureau/moderation"
          className="inline-flex min-h-11 items-center font-semibold text-moss-dark underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          ← Toutes les saisies
        </Link>
      </p>
      {missing ? (
        <p role="alert" className="mt-4 rounded-[1.25rem] bg-tuile-pale p-6 font-medium text-tuile">
          Cette saisie n&apos;existe pas (ou plus).
        </p>
      ) : error ? (
        <p role="alert" className="mt-4 font-medium text-tuile">
          {error}
        </p>
      ) : !sub ? (
        <p className="mt-4 text-ink-muted" role="status">
          Chargement de la saisie…
        </p>
      ) : (
        <Body sub={sub} onChange={setSub} />
      )}
    </div>
  );
}

function Body({ sub, onChange }: { sub: Submission; onChange: (s: Submission) => void }) {
  const hasReview = !!sub.review;
  const actionable = sub.status === "submitted" || sub.status === "reviewed";
  const [preview, setPreview] = useState<"original" | "corrected">(hasReview ? "corrected" : "original");
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [next, setNext] = useState<{ id: string; title: string } | null | undefined>(undefined);
  const confirmRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const reasonId = useId();

  useEffect(() => {
    if (pending) confirmRef.current?.focus();
  }, [pending]);

  const shown: ContentFields = preview === "corrected" && sub.review ? sub.review.corrected : sub.original;

  async function run() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      const r =
        pending === "reject"
          ? await api<{ submission: Submission }>(`/api/admin/submissions/${sub.id}/reject`, {
              reason: reason.trim(),
            })
          : await api<{ submission: Submission }>(`/api/admin/submissions/${sub.id}/publish`, {
              version: pending,
            });
      setDone(
        pending === "reject"
          ? "Saisie refusée. L'auteur verra le motif indiqué."
          : pending === "corrected"
            ? "Version corrigée publiée sur le site."
            : "Version originale publiée sur le site.",
      );
      setPending(null);
      onChange(r.submission);
      api<{ submissions: Submission[] }>("/api/admin/submissions?status=submitted,reviewed")
        .then((l) => {
          const n = l.submissions.find((x) => x.id !== sub.id);
          setNext(n ? { id: n.id, title: n.original.title } : null);
        })
        .catch(() => setNext(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (done) resultRef.current?.focus();
  }, [done]);

  const confirmText =
    pending === "original"
      ? "Publier la version originale, telle que saisie par le bureau ?"
      : pending === "corrected"
        ? "Publier la version corrigée par l'agent ?"
        : "Rejeter cette saisie ? Elle ne sera pas publiée.";

  return (
    <article className="mt-4">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-moss px-3 py-1 text-sm font-semibold text-white">
            {KIND_LABEL[sub.kind]}
          </span>
          <StatusBadge status={sub.status} />
        </div>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink">
          {sub.original.title}
        </h2>
        <p className="mt-1 text-ink-muted">
          Saisie par {sub.author} · {formatDateTime(sub.createdAt)}
        </p>
      </header>

      <div
        ref={resultRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="outline-none"
      >
        {done ? (
          <div className="mt-6 rounded-[1.25rem] bg-pre-pale p-6">
            <p className="text-lg font-semibold text-moss-dark">{done}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {next ? (
                <Link href={`/espace-bureau/moderation/${next.id}`} className={btnPrimary}>
                  Saisie suivante : {next.title}
                </Link>
              ) : next === null ? (
                <p className="text-moss-dark">Plus aucune saisie à traiter.</p>
              ) : (
                <p className="text-ink-muted">Recherche de la saisie suivante…</p>
              )}
              <Link href="/espace-bureau/moderation" className={btnSecondary}>
                Retour à la liste
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {sub.status === "published" && sub.published && !done ? (
        <p className="mt-6 rounded-[1.25rem] bg-ciel-pale p-5 text-ink">
          Publiée le {formatDateTime(sub.published.publishedAt)} (version{" "}
          {sub.published.version === "corrected" ? "corrigée" : "originale"}).
        </p>
      ) : null}
      {sub.status === "rejected" && !done ? (
        <p className="mt-6 rounded-[1.25rem] bg-tuile-pale p-5 text-ink">
          <strong>Refusée.</strong> Motif : {sub.rejectionReason ?? "non renseigné"}
        </p>
      ) : null}

      {sub.review ? (
        <section aria-labelledby="avis" className="mt-8 rounded-[1.25rem] border border-border-subtle bg-surface p-6">
          <h3 id="avis" className="font-display text-xl font-bold text-moss-dark">
            Avis de l&apos;agent
          </h3>
          <p className="mt-1 text-sm text-ink-muted">Relue le {formatDateTime(sub.review.reviewedAt)}</p>
          <p className="mt-3 font-semibold">
            {sub.review.ok ? "Aucun blocage relevé." : "Des corrections sont proposées."}
          </p>
          <p className="mt-2">{sub.review.summary}</p>
          {sub.review.issues.length > 0 ? (
            <>
              <h4 className="mt-4 font-semibold">Problèmes relevés</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {sub.review.issues.map((i, k) => (
                  <li key={k}>{i}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-ink-muted">Aucun problème relevé.</p>
          )}
        </section>
      ) : actionable ? (
        <p className="mt-8 rounded-[1.25rem] bg-colza-pale p-5 text-ink">
          <strong>En attente de relecture par l&apos;agent.</strong> Vous pouvez publier l&apos;original
          sans attendre, ou revenir plus tard pour la version corrigée.
        </p>
      ) : null}

      <Comparison sub={sub} />

      <section aria-labelledby="apercu" className="mt-10">
        <h3 id="apercu" className="font-display text-xl font-bold text-moss-dark">
          Aperçu sur le site
        </h3>
        {hasReview ? (
          <div role="group" aria-label="Version à prévisualiser" className="mt-3 flex flex-wrap gap-2">
            {(["original", "corrected"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={preview === v}
                onClick={() => setPreview(v)}
                className={`inline-flex min-h-11 items-center rounded-full border-2 px-5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  preview === v
                    ? "border-moss bg-moss text-white"
                    : "border-moss bg-white text-moss-dark hover:bg-pre-pale"
                }`}
              >
                {v === "original" ? "Original" : "Version corrigée"}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-4">
          {sub.kind === "article" ? (
            <ArticlePreview f={shown as ArticleFields} />
          ) : (
            <EventPreview f={shown as EventFields} />
          )}
        </div>
      </section>

      {actionable && !done ? (
        <section aria-labelledby="actions" className="mt-10 rounded-[1.25rem] border-2 border-moss p-6">
          <h3 id="actions" className="font-display text-xl font-bold text-moss-dark">
            Décision
          </h3>
          {pending === null ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" className={btnSecondary} onClick={() => setPending("original")}>
                Publier l&apos;original
              </button>
              {hasReview ? (
                <button type="button" className={btnPrimary} onClick={() => setPending("corrected")}>
                  Publier la version corrigée
                </button>
              ) : null}
              <button type="button" className={btnDanger} onClick={() => setPending("reject")}>
                Rejeter
              </button>
            </div>
          ) : (
            <div
              ref={confirmRef}
              tabIndex={-1}
              role="group"
              aria-label="Confirmation"
              className="mt-4 rounded-xl bg-canvas p-4 outline-none"
            >
              <p className="text-lg font-semibold">{confirmText}</p>
              {pending === "reject" ? (
                <>
                  <label htmlFor={reasonId} className="mt-4 block font-semibold">
                    Motif du refus (obligatoire, 500 caractères maximum)
                  </label>
                  <textarea
                    id={reasonId}
                    required
                    maxLength={500}
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-2 block w-full rounded-xl border-2 border-ink-subtle bg-white p-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  />
                </>
              ) : null}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={run}
                  disabled={busy || (pending === "reject" && !reason.trim())}
                  className={pending === "reject" ? btnDanger : btnPrimary}
                >
                  {busy ? "En cours…" : pending === "reject" ? "Confirmer le refus" : "Confirmer la publication"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPending(null);
                    setError("");
                  }}
                  className={btnSecondary}
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
          <p role="alert" className="mt-3 font-medium text-tuile">
            {error}
          </p>
        </section>
      ) : null}

      <section aria-labelledby="chrono" className="mt-10">
        <h3 id="chrono" className="font-display text-xl font-bold text-moss-dark">
          Chronologie
        </h3>
        <ol className="mt-3 space-y-3 border-l-2 border-moss pl-5">
          {sub.history.map((h, k) => (
            <li key={k}>
              <p className="font-semibold">{ACTION_LABEL[h.action] ?? h.action}</p>
              <p className="text-ink-muted">
                {formatDateTime(h.at)} · {h.by}
              </p>
              {h.note ? <p className="mt-1">{h.note}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

function Marked({ parts }: { parts: DiffPart[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.kind === "same" ? (
          <span key={i}>{p.text}</span>
        ) : p.kind === "add" ? (
          <ins key={i} className="rounded-sm bg-pre-pale font-semibold text-moss-dark underline decoration-2 underline-offset-2">
            <span className="sr-only">[ajouté : </span>
            {p.text}
            <span className="sr-only">]</span>
          </ins>
        ) : (
          <del key={i} className="rounded-sm bg-tuile-pale text-tuile line-through decoration-2">
            <span className="sr-only">[supprimé : </span>
            {p.text}
            <span className="sr-only">]</span>
          </del>
        ),
      )}
    </>
  );
}

function Comparison({ sub }: { sub: Submission }) {
  const review = sub.review;
  const rows = useMemo(
    () =>
      FIELD_ORDER[sub.kind]
        .map((key) => {
          const a = fieldValue(sub.original, key);
          const b = review ? fieldValue(review.corrected, key) : a;
          if (!a && !b) return null;
          return { key, a, b, changed: a !== b, diff: a !== b ? wordDiff(a, b) : null };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
    [sub, review],
  );
  const changes = rows.filter((r) => r.changed).length;

  return (
    <section aria-labelledby="comparaison" className="mt-10">
      <h3 id="comparaison" className="font-display text-xl font-bold text-moss-dark">
        {review ? "Original et version corrigée" : "Texte saisi"}
      </h3>
      {review ? (
        <p className="mt-2 text-ink-muted">
          {changes === 0
            ? "L'agent n'a modifié aucun champ."
            : `${changes} champ${changes > 1 ? "s" : ""} modifié${changes > 1 ? "s" : ""}. `}
          {changes > 0 ? (
            <>
              <del className="rounded-sm bg-tuile-pale px-1 text-tuile line-through decoration-2">Barré</del>{" "}
              = retiré ;{" "}
              <ins className="rounded-sm bg-pre-pale px-1 font-semibold text-moss-dark underline decoration-2 underline-offset-2">
                souligné
              </ins>{" "}
              = ajouté.
            </>
          ) : null}
        </p>
      ) : null}
      <div className="mt-4 space-y-5">
        {rows.map((r) => (
          <div key={r.key} className="rounded-[1.25rem] border border-border-subtle bg-surface p-4 sm:p-5">
            <h4 className="font-semibold text-ink">
              {FIELD_LABELS[r.key]}
              {review ? (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-sm font-semibold ${
                    r.changed ? "bg-colza-pale text-ink" : "bg-canvas text-ink-muted"
                  }`}
                >
                  {r.changed ? "modifié" : "inchangé"}
                </span>
              ) : null}
            </h4>
            {review && r.changed ? (
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">Original</p>
                  <p className="mt-1 whitespace-pre-wrap break-words">
                    {r.a ? <Marked parts={r.diff!.before} /> : <em className="text-ink-muted">(vide)</em>}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
                    Corrigée par l&apos;agent
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words">
                    {r.b ? <Marked parts={r.diff!.after} /> : <em className="text-ink-muted">(vide)</em>}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 whitespace-pre-wrap break-words">{r.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ArticlePreview({ f }: { f: ArticleFields }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] bg-moss text-white">
      {f.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/uploads/${f.image}`} alt="" className="h-48 w-full object-cover" />
      ) : null}
      <div className="p-6 sm:p-8">
        <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
          {formatDay(f.publishedAt)}
        </p>
        <h4 className="font-display mt-4 text-3xl font-bold leading-[1.05] tracking-tight">{f.title}</h4>
        <p className="mt-4 max-w-lg text-lg leading-relaxed text-white/90">{f.summary}</p>
        <span className="mt-6 inline-flex min-h-11 items-center rounded-full bg-white px-6 text-sm font-semibold text-ink">
          {f.linkLabel || "Lire la suite"} →
        </span>
        <p className="mt-3 text-sm text-white/80">Aperçu : le lien n&apos;est pas actif.</p>
      </div>
    </div>
  );
}

function EventPreview({ f }: { f: EventFields }) {
  const d = new Date(`${f.date}T00:00:00Z`);
  const valid = !Number.isNaN(d.getTime());
  const hours = f.startTime ? (f.endTime ? `${f.startTime} – ${f.endTime}` : `à partir de ${f.startTime}`) : "";
  return (
    <div className="flex gap-4 rounded-[1.25rem] border border-border-subtle bg-surface p-4 sm:p-5">
      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-colza text-ink">
        <span className="font-display text-3xl font-bold leading-none">{valid ? d.getUTCDate() : "?"}</span>
        <span className="text-sm font-semibold uppercase">
          {valid ? d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }) : ""}
        </span>
      </div>
      <div className="min-w-0">
        <h4 className="font-display text-xl font-bold text-ink">{f.title}</h4>
        <p className="mt-1 font-semibold text-moss-dark">
          {formatDay(f.date)}
          {hours ? ` · ${hours}` : ""}
        </p>
        <p className="text-ink-muted">{f.place}</p>
        <p className="mt-2 whitespace-pre-wrap break-words">{f.description}</p>
        {f.linkUrl ? <p className="mt-2 break-all text-sm text-ciel underline">{f.linkUrl}</p> : null}
      </div>
    </div>
  );
}
