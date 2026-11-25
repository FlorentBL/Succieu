"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Submission } from "@/lib/content/types";
import {
  api,
  ApiError,
  formatDateTime,
  KIND_LABEL,
  STATUS_LABEL,
} from "@/lib/moderation";

type Tab = "pending" | "done";

const TABS: { id: Tab; label: string; status: string }[] = [
  { id: "pending", label: "À traiter", status: "submitted,reviewed" },
  { id: "done", label: "Traitées", status: "published,rejected" },
];

export function StatusBadge({ status }: { status: Submission["status"] }) {
  const style =
    status === "reviewed"
      ? "bg-pre-pale text-moss-dark"
      : status === "submitted"
        ? "bg-colza-pale text-ink"
        : status === "published"
          ? "bg-ciel-pale text-ink"
          : "bg-tuile-pale text-tuile";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${style}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ModerationList() {
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const status = TABS.find((t) => t.id === tab)!.status;
    api<{ submissions: Submission[] }>(`/api/admin/submissions?status=${status}`)
      .then((r) => {
        if (live) {
          setError("");
          setItems(r.submissions);
        }
      })
      .catch((e: ApiError) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [tab]);

  function choose(t: Tab) {
    if (t === tab) return;
    setItems(null);
    setTab(t);
  }

  return (
    <section aria-labelledby="liste-titre">
      <h2 id="liste-titre" className="sr-only">
        Liste des saisies
      </h2>
      <div role="group" aria-label="Filtrer les saisies" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => choose(t.id)}
            className={`inline-flex min-h-12 items-center rounded-full border-2 px-6 text-base font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              tab === t.id
                ? "border-moss bg-moss text-white"
                : "border-moss bg-white text-moss-dark hover:bg-pre-pale"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6" aria-live="polite">
        {error ? (
          <p role="alert" className="font-medium text-tuile">
            {error}
          </p>
        ) : items === null ? (
          <p className="text-ink-muted">Chargement des saisies…</p>
        ) : items.length === 0 ? (
          <p className="rounded-[1.25rem] bg-pre-pale p-6 text-lg text-moss-dark">
            {tab === "pending"
              ? "Rien à traiter pour le moment."
              : "Aucune saisie traitée pour l'instant."}
          </p>
        ) : (
          <ul className="grid gap-3">
            {items.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/espace-bureau/moderation/${s.id}`}
                  className="block rounded-[1.25rem] border border-border-subtle bg-surface p-5 shadow-[0_1px_2px_rgba(20,33,26,0.05)] transition hover:border-moss focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-moss px-3 py-1 text-sm font-semibold text-white">
                      {KIND_LABEL[s.kind]}
                    </span>
                    <StatusBadge status={s.status} />
                  </span>
                  <span className="font-display mt-3 block text-xl font-bold text-ink">
                    {s.published?.fields.title ?? s.original.title}
                  </span>
                  <span className="mt-1 block text-ink-muted">
                    Par {s.author} · {formatDateTime(s.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
