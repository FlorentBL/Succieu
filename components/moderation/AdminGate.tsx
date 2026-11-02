"use client";

import { useCallback, useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { PageHero } from "@/components/ui/PageHero";
import { PageShell } from "@/components/ui/PageShell";
import { api } from "@/lib/moderation";
import { btnPrimary, btnSecondary } from "./ui";

type State = "loading" | "in" | "out";

/**
 * Réserve ses enfants à la session admin. Hors session, affiche la connexion sur place :
 * une fois connecté, l'URL demandée (par exemple le détail d'une saisie) reste affichée.
 */
export function AdminGate({ title, children }: { title: string; children: ReactNode }) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    api<{ authenticated: boolean }>("/api/admin/session")
      .then((s) => setState(s.authenticated ? "in" : "out"))
      .catch(() => setState("out"));
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/api/admin/logout", {});
    } finally {
      setState("out");
    }
  }, []);

  return (
    <>
      <PageHero
        compact
        title={title}
        description="Espace réservé à l'administrateur du site : relecture, publication et refus des saisies du bureau municipal."
      />
      <PageShell className="py-8 sm:py-10">
        {state === "loading" ? (
          <p role="status" className="text-ink-muted">
            Vérification de votre accès…
          </p>
        ) : state === "out" ? (
          <LoginForm onDone={() => setState("in")} />
        ) : (
          <>
            <div className="mb-6 flex justify-end">
              <button type="button" onClick={logout} className={btnSecondary}>
                Se déconnecter
              </button>
            </div>
            {children}
          </>
        )}
      </PageShell>
    </>
  );
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", { password });
      setPassword("");
      onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Connexion impossible, réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-md rounded-[1.25rem] border border-border-subtle bg-surface p-6 shadow-[0_10px_28px_-18px_rgba(20,33,26,0.22)] sm:p-8"
    >
      <h2 className="font-display text-2xl font-bold text-moss-dark">Connexion administrateur</h2>
      <p className="mt-2 text-ink-muted">
        Ce mot de passe est distinct de celui du bureau municipal.
      </p>
      <label htmlFor={id} className="mt-6 block text-base font-semibold">
        Mot de passe administrateur
      </label>
      <input
        id={id}
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-describedby={error ? `${id}-err` : undefined}
        aria-invalid={error ? true : undefined}
        className="mt-2 block min-h-12 w-full rounded-xl border-2 border-ink-subtle bg-white px-4 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
      <div id={`${id}-err`} role="alert" className="mt-3 text-base font-medium text-tuile">
        {error}
      </div>
      <button type="submit" disabled={busy || !password} className={`${btnPrimary} mt-4 w-full`}>
        {busy ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
