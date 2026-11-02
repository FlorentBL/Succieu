"use client";

import type { ContentFields, Submission, SubmissionStatus } from "@/lib/content/types";
import { Card } from "@/components/ui/Card";

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: "Transmise",
  reviewed: "Relue",
  published: "Publiée",
  rejected: "Refusée",
};

const STATUS_STYLE: Record<SubmissionStatus, string> = {
  submitted: "bg-ciel-pale text-[#174a82]",
  reviewed: "bg-colza-pale text-ink",
  published: "bg-pre-pale text-moss-dark",
  rejected: "bg-tuile-pale text-[#8a3320]",
};

const ACTION_LABEL: Record<string, string> = {
  submitted: "Transmise",
  reviewed: "Relue par l’agent",
  published: "Publiée",
  rejected: "Refusée",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
const fmtDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { dateStyle: "long" });

function FieldsList({ kind, f }: { kind: Submission["kind"]; f: ContentFields }) {
  const rows: [string, string | undefined][] =
    kind === "article"
      ? [
          ["Titre", (f as { title: string }).title],
          ["Texte court", (f as { summary: string }).summary],
          ["Texte complet", (f as { body: string }).body],
          ["Date de publication", fmtDay((f as { publishedAt: string }).publishedAt)],
          ["Lien", [(f as { linkLabel?: string }).linkLabel, (f as { linkUrl?: string }).linkUrl].filter(Boolean).join(" — ") || undefined],
          ["Image", (f as { image?: string }).image ? "Jointe" : undefined],
        ]
      : (() => {
          const e = f as { title: string; date: string; startTime?: string; endTime?: string; place: string; description: string; linkUrl?: string };
          const hours = e.startTime ? `de ${e.startTime}${e.endTime ? ` à ${e.endTime}` : ""}` : undefined;
          return [
            ["Titre", e.title],
            ["Date", fmtDay(e.date)],
            ["Horaires", hours],
            ["Lieu", e.place],
            ["Description", e.description],
            ["Lien", e.linkUrl],
          ] as [string, string | undefined][];
        })();
  return (
    <dl className="mt-2 space-y-2 text-[0.95rem]">
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt className="font-semibold text-ink">{k}</dt>
            <dd className="whitespace-pre-line break-words text-ink-muted">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 border-t border-border-subtle pt-4">
      <h4 className="font-display text-base font-bold text-ink">{title}</h4>
      {children}
    </section>
  );
}

function Item({ s }: { s: Submission }) {
  const title = s.original.title;
  const r = s.review;
  return (
    <Card className="!p-5 sm:!p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="font-display break-words text-lg font-bold text-ink">{title}</h3>
          <p className="text-sm text-ink-muted">
            {s.kind === "article" ? "Actualité · envoyée le" : "Agenda · envoyé le"}{" "}
            <time dateTime={s.createdAt}>{fmt(s.createdAt)}</time>
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[s.status]}`}>
          <span className="sr-only">Statut : </span>
          {STATUS_LABEL[s.status]}
        </span>
      </div>

      {s.status === "rejected" && s.rejectionReason ? (
        <Block title="Motif du refus">
          <p className="mt-2 whitespace-pre-line text-[0.95rem] text-ink">{s.rejectionReason}</p>
        </Block>
      ) : null}

      {r ? (
        <Block title="Avis de l’agent de relecture">
          <p className="mt-2 text-[0.95rem] text-ink-muted">{r.summary}</p>
          {r.issues.length ? (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">Problèmes relevés</p>
              <ul className="mt-1 list-disc pl-5 text-[0.95rem] text-ink-muted">
                {r.issues.map((i, n) => (
                  <li key={n}>{i}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">Aucun problème relevé.</p>
          )}
          <details className="mt-3 rounded-xl bg-canvas px-4 py-3">
            <summary className="cursor-pointer text-[0.95rem] font-semibold text-moss-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">
              Version corrigée proposée
            </summary>
            <FieldsList kind={s.kind} f={r.corrected} />
          </details>
        </Block>
      ) : null}

      {s.published ? (
        <Block title="Version publiée">
          <p className="mt-1 text-sm text-ink-muted">
            {s.published.version === "corrected" ? "Version corrigée" : "Votre version d’origine"}, publiée le{" "}
            {fmt(s.published.publishedAt)}.
          </p>
          <FieldsList kind={s.kind} f={s.published.fields} />
        </Block>
      ) : null}

      <details className="mt-5 border-t border-border-subtle pt-4">
        <summary className="cursor-pointer text-[0.95rem] font-semibold text-moss-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]">
          Détails et chronologie
        </summary>
        <h4 className="mt-3 text-sm font-semibold text-ink">Votre saisie</h4>
        <FieldsList kind={s.kind} f={s.original} />
        <h4 className="mt-4 text-sm font-semibold text-ink">Chronologie</h4>
        <ol className="mt-2 space-y-2 border-l-2 border-pre-pale pl-4 text-[0.95rem]">
          {s.history.map((h, n) => (
            <li key={n}>
              <span className="font-semibold text-ink">{ACTION_LABEL[h.action] ?? h.action}</span>
              <span className="text-ink-muted">
                {" "}
                · <time dateTime={h.at}>{fmt(h.at)}</time> · {h.by}
              </span>
              {h.note ? <p className="whitespace-pre-line text-ink-muted">{h.note}</p> : null}
            </li>
          ))}
        </ol>
      </details>
    </Card>
  );
}

export function History({ items, loading, error }: { items: Submission[] | null; loading: boolean; error: string }) {
  return (
    <section aria-labelledby="historique-titre" className="mt-12">
      <h2 id="historique-titre" className="font-display text-2xl font-bold text-moss-dark">
        Mes saisies
      </h2>
      <div className="mt-4 space-y-4" aria-live="polite">
        {error ? (
          <p role="alert" className="rounded-xl border border-tuile/50 bg-tuile-pale px-4 py-3 text-[0.95rem]">{error}</p>
        ) : loading && !items ? (
          <p className="text-ink-muted">Chargement…</p>
        ) : items && items.length === 0 ? (
          <p className="rounded-xl bg-canvas px-4 py-4 text-ink-muted">Vous n’avez encore rien envoyé.</p>
        ) : (
          items?.map((s) => <Item key={s.id} s={s} />)
        )}
      </div>
    </section>
  );
}
