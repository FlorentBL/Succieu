"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Submission } from "@/lib/content/types";
import { Card } from "@/components/ui/Card";
import { IconDocument, IconClock } from "@/components/icons/UiIcons";
import { ApiError, getNames, getSession, getSubmissions, login, logout } from "./api";
import { ArticleForm, EventForm } from "./SubmissionForms";
import { Button, Notice, SelectField, TextField, focusRing } from "./fields";
import { History } from "./History";

function LoginCard({ onLoggedIn }: { onLoggedIn: (name: string) => void }) {
  const [names, setNames] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getNames().then(setNames).catch(() => setMessage("La liste des noms n’a pas pu être chargée. Rechargez la page."));
  }, []);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!name) errs.name = "Choisissez votre nom dans la liste.";
    if (!password) errs.password = "Saisissez le mot de passe du bureau.";
    setErrors(errs);
    setMessage("");
    if (Object.keys(errs).length) {
      document.getElementById(errs.name ? "login-name" : "login-password")?.focus();
      return;
    }
    setBusy(true);
    try {
      const r = await login(name, password);
      onLoggedIn(r.name);
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "rate_limited") {
        const min = err.retryAfter ? Math.max(1, Math.ceil(err.retryAfter / 60)) : null;
        setMessage(`Trop de tentatives. Patientez ${min ? `environ ${min} minute${min > 1 ? "s" : ""}` : "quelques minutes"} avant de réessayer.`);
      } else if (err.code === "unauthorized") {
        setErrors({ password: "Mot de passe incorrect (ou nom non autorisé). Vérifiez et réessayez." });
        setPassword("");
        document.getElementById("login-password")?.focus();
      } else if (err.code === "server_misconfigured") {
        setMessage("L’espace bureau n’est pas encore configuré. Prévenez l’administrateur du site.");
      } else {
        setMessage(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mt-2 max-w-xl">
      <h2 className="font-display text-2xl font-bold text-moss-dark">Connexion</h2>
      <p className="mt-1 text-ink-muted">Réservé aux membres du bureau.</p>
      <form noValidate onSubmit={submit} className="mt-5 space-y-5">
        <SelectField id="login-name" label="Votre nom" value={name} onChange={setName} options={names}
          placeholder="Choisir dans la liste" error={errors.name} />
        <TextField id="login-password" label="Mot de passe du bureau" type="password" autoComplete="current-password"
          value={password} onChange={setPassword} error={errors.password} />
        {message ? <Notice tone="error">{message}</Notice> : null}
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
      <p className="mt-6 border-t border-border-subtle pt-4 text-sm text-ink-muted">
        Validation des publications :{" "}
        <Link href="/espace-bureau/moderation" className={`font-semibold text-moss-dark underline underline-offset-4 ${focusRing}`}>
          accès modération
        </Link>
      </p>
    </Card>
  );
}

type Tab = "article" | "event";

function Dashboard({ name, onLogout }: { name: string; onLogout: () => void }) {
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
      if ((e as ApiError).code === "unauthorized") onLogout();
      else setError("L’historique n’a pas pu être chargé.");
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "article", label: "Actualités", icon: <IconDocument className="h-5 w-5" /> },
    { id: "event", label: "Rendez-vous", icon: <IconClock className="h-5 w-5" /> },
  ];

  function onKey(ev: React.KeyboardEvent) {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    const next: Tab = tab === "article" ? "event" : "article";
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-pre-pale px-4 py-3">
        <p className="text-[0.95rem] text-ink">
          Connecté·e : <strong>{name}</strong>
        </p>
        <Button variant="ghost" className="!min-h-11 !px-5 text-[0.95rem]" onClick={onLogout}>
          Se déconnecter
        </Button>
      </div>

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
              {t.id === "article" ? "Proposer une actualité" : "Proposer un rendez-vous"}
            </h2>
            <p className="mb-5 mt-1 text-ink-muted">Les champs sans mention « facultatif » sont obligatoires.</p>
            {t.id === "article" ? <ArticleForm onDone={() => void load()} /> : <EventForm onDone={() => void load()} />}
          </Card>
        </div>
      ))}

      <History items={items} loading={loading} error={error} />
    </>
  );
}

export function BureauApp() {
  const [state, setState] = useState<{ ready: boolean; name?: string }>({ ready: false });

  useEffect(() => {
    getSession()
      .then((s) => setState({ ready: true, name: s.authenticated ? s.name : undefined }))
      .catch(() => setState({ ready: true }));
  }, []);

  const doLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      /* le cookie expire de toute façon */
    }
    setState({ ready: true });
  }, []);

  if (!state.ready) return <p className="mt-4 text-ink-muted" role="status">Chargement…</p>;
  if (!state.name) return <LoginCard onLoggedIn={(name) => setState({ ready: true, name })} />;
  return <Dashboard name={state.name} onLogout={doLogout} />;
}
