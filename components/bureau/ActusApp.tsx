"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Submission } from "@/lib/content/types";
import { Card } from "@/components/ui/Card";
import { IconDocument, IconClock } from "@/components/icons/UiIcons";
import { ApiError, getSubmissions } from "./api";
import { ArticleForm, EventForm } from "./SubmissionForms";
import { focusRing } from "./fields";
import { History } from "./History";

type Tab = "article" | "event";

/** Module Actualités & agenda : la session et les droits viennent du hub (page serveur). */
export function ActusApp({ canWrite, isAdmin }: { canWrite: boolean; isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("article");
  const [items, setItems] = useState<Submission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ article: null, event: null });

  const load = useCallback(async () => {
    try {
      const list = await getSubmissions();
      setItems([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      setError("");
    } catch (e) {
      if ((e as ApiError).code === "unauthorized") window.location.assign("/espace-bureau/connexion");
      else setError("L’historique n’a pas pu être chargé.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "article", label: "Actualités", icon: <IconDocument className="h-5 w-5" /> },
    { id: "event", label: "Agenda", icon: <IconClock className="h-5 w-5" /> },
  ];

  function onKey(ev: React.KeyboardEvent) {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    const next: Tab = tab === "article" ? "event" : "article";
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <>
      {isAdmin ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-pre-pale px-4 py-3">
          <p className="text-[0.95rem] text-ink">Vous pouvez modérer : les saisies attendent votre décision.</p>
          <Link href="/espace-bureau/actualites/moderation" className={`inline-flex min-h-11 items-center rounded-full bg-moss-dark px-5 text-[0.95rem] font-semibold text-white ${focusRing}`}>
            Modérer les saisies
          </Link>
        </div>
      ) : null}

      {canWrite ? (<>
      <div role="tablist" aria-label="Type de saisie" className="mt-8 grid grid-cols-2 gap-2 rounded-full bg-canvas p-1.5" onKeyDown={onKey}>
        {tabs.map((t) => (
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[t.id] = el; }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-full px-3 text-base font-semibold transition-colors ${focusRing} ${
              tab === t.id ? "bg-moss-dark text-white" : "text-ink-muted hover:bg-pre-pale"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={tab !== t.id} className="mt-4">
          <Card>
            <h2 className="font-display text-2xl font-bold text-moss-dark">
              {t.id === "article" ? "Proposer une actualité" : "Ajouter à l’agenda"}
            </h2>
            <p className="mb-5 mt-1 text-ink-muted">Les champs sans mention « facultatif » sont obligatoires.</p>
            {t.id === "article" ? <ArticleForm onDone={() => void load()} /> : <EventForm onDone={() => void load()} />}
          </Card>
        </div>
      ))}

      </>) : (
        <div className="mt-4"><p className="rounded-xl border border-border-subtle bg-canvas px-4 py-3 text-[0.95rem] text-ink-muted">Vous consultez vos saisies en lecture seule : vous ne pouvez pas en déposer de nouvelles.</p></div>
      )}

      <History items={items} loading={loading} error={error} />
    </>
  );
}
