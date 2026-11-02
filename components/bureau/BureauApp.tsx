"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Submission } from "@/lib/content/types";
import { Card } from "@/components/ui/Card";
import { IconDocument, IconClock } from "@/components/icons/UiIcons";
import { ApiError, chooseName, getNames, getSession, getSubmissions, login, logout } from "./api";
import { ArticleForm, EventForm } from "./SubmissionForms";
import { Button, Notice, TextField, focusRing } from "./fields";
import { History } from "./History";

function PasswordCard({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setMessage("");
    if (!password) {
      setError("Saisissez le mot de passe du bureau.");
      document.getElementById("login-password")?.focus();
      return;
    }
    setError("");
    setBusy(true);
    try {
      await login(password);
      onLoggedIn();
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "rate_limited") {
        const min = err.retryAfter ? Math.max(1, Math.ceil(err.retryAfter / 60)) : null;
        setMessage(`Trop de tentatives. Patientez ${min ? `environ ${min} minute${min > 1 ? "s" : ""}` : "quelques minutes"} avant de réessayer.`);
      } else if (err.code === "unauthorized") {
        setError("Mot de passe incorrect. Vérifiez et réessayez.");
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
        <TextField id="login-password" label="Mot de passe du bureau" type="password" autoComplete="current-password"
          value={password} onChange={setPassword} error={error} />
        {message ? <Notice tone="error">{message}</Notice> : null}
        <Button type="submit" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </Card>
  );
}

function NameCard({ onChosen, onLogout }: { onChosen: (name: string) => void; onLogout: () => void }) {
  const [names, setNames] = useState<string[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    getNames()
      .then(setNames)
      .catch((e) => {
        if ((e as ApiError).code === "unauthorized") onLogout();
        else setMessage("La liste des noms n’a pas pu être chargée. Rechargez la page.");
      });
  }, [onLogout]);

  async function pick(name: string) {
    setBusy(name);
    setMessage("");
    try {
      onChosen(await chooseName(name));
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "unauthorized") onLogout();
      else setMessage(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="mt-2 max-w-xl">
      <h2 className="font-display text-2xl font-bold text-moss-dark">Qui êtes-vous ?</h2>
      <p className="mt-1 text-ink-muted">Votre nom accompagnera vos saisies.</p>
      {names === null && !message ? <p className="mt-5 text-ink-muted" role="status">Chargement…</p> : null}
      {names ? (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {names.map((n) => (
            <li key={n}>
              <button
                type="button"
                onClick={() => pick(n)}
                disabled={busy !== null}
                className={`flex min-h-14 w-full items-center justify-center rounded-2xl border border-border-subtle bg-pre-pale px-3 text-base font-semibold text-moss-dark transition hover:border-moss hover:bg-moss hover:text-white disabled:opacity-60 ${focusRing}`}
              >
                {busy === n ? "…" : n}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {message ? <div className="mt-4"><Notice tone="error">{message}</Notice></div> : null}
      <p className="mt-6 text-sm">
        <button type="button" onClick={onLogout} className={`text-ink-muted underline underline-offset-4 hover:text-ink ${focusRing}`}>
          Se déconnecter
        </button>
      </p>
    </Card>
  );
}

type Tab = "article" | "event";

function Dashboard({ name, onLogout, onChangeName }: { name: string; onLogout: () => void; onChangeName: () => void }) {
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
          Connecté·e : <strong>{name}</strong>{" "}
          <button type="button" onClick={onChangeName} className={`ml-1 text-sm text-ink-muted underline underline-offset-4 hover:text-ink ${focusRing}`}>
            changer
          </button>
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

type AppState = { ready: boolean; authenticated: boolean; name: string | null };

export function BureauApp() {
  const [state, setState] = useState<AppState>({ ready: false, authenticated: false, name: null });

  useEffect(() => {
    getSession()
      .then((s) => setState({ ready: true, authenticated: s.authenticated, name: s.name ?? null }))
      .catch(() => setState({ ready: true, authenticated: false, name: null }));
  }, []);

  const doLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      /* le cookie expire de toute façon */
    }
    setState({ ready: true, authenticated: false, name: null });
  }, []);

  if (!state.ready) return <p className="mt-4 text-ink-muted" role="status">Chargement…</p>;
  if (!state.authenticated) {
    return <PasswordCard onLoggedIn={() => setState({ ready: true, authenticated: true, name: null })} />;
  }
  if (!state.name) {
    return <NameCard onLogout={doLogout} onChosen={(name) => setState({ ready: true, authenticated: true, name })} />;
  }
  return (
    <Dashboard
      name={state.name}
      onLogout={doLogout}
      onChangeName={() => setState({ ready: true, authenticated: true, name: null })}
    />
  );
}
