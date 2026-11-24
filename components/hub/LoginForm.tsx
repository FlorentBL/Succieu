"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Notice, TextField } from "@/components/bureau/fields";
import { ApiError, hubLogin, waitMessage } from "./api";

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setMessage("");
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = "Saisissez votre identifiant (votre prénom).";
    if (!password) next.password = "Saisissez votre mot de passe.";
    setErrors(next);
    if (next.identifier || next.password) {
      document.getElementById(next.identifier ? "hub-identifier" : "hub-password")?.focus();
      return;
    }
    setBusy(true);
    try {
      const s = await hubLogin(identifier, password);
      router.replace(s.mustChangePassword ? "/espace-bureau/nouveau-mot-de-passe" : "/espace-bureau");
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "rate_limited") setMessage(waitMessage(err.retryAfter));
      else if (err.code === "unauthorized") {
        setMessage("Identifiant ou mot de passe incorrect. Vérifiez et réessayez.");
        setPassword("");
        document.getElementById("hub-password")?.focus();
      } else if (err.code === "server_misconfigured") {
        setMessage("L’espace bureau n’est pas encore configuré. Prévenez l’administrateur du site.");
      } else setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="mt-5 space-y-5">
      <TextField id="hub-identifier" label="Identifiant" hint="Votre prénom, sans accent." autoComplete="username"
        value={identifier} onChange={setIdentifier} error={errors.identifier} />
      <TextField id="hub-password" label="Mot de passe" type="password" autoComplete="current-password"
        value={password} onChange={setPassword} error={errors.password} />
      {message ? <Notice tone="error">{message}</Notice> : null}
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
