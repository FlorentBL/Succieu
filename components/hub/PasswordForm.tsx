"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Notice, TextField } from "@/components/bureau/fields";
import { ApiError, hubChangePassword, waitMessage } from "./api";

/** Doit rester aligné sur MIN_PASSWORD_LENGTH de lib/hub/users.ts (non importable côté client : accès disque). */
const MIN = 10;

export function PasswordForm({ forced = false }: { forced?: boolean }) {
  const router = useRouter();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [again, setAgain] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setMessage("");
    setDone(false);
    const next: Record<string, string> = {};
    if (!oldPw) next.old = forced ? "Saisissez le mot de passe provisoire reçu." : "Saisissez votre mot de passe actuel.";
    if (newPw.length < MIN) next.new = `Au moins ${MIN} caractères.`;
    else if (newPw === oldPw) next.new = "Le nouveau mot de passe doit être différent de l’ancien.";
    if (again !== newPw) next.again = "Les deux saisies ne sont pas identiques.";
    setErrors(next);
    const first = (["old", "new", "again"] as const).find((k) => next[k]);
    if (first) {
      document.getElementById(`pw-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      await hubChangePassword(oldPw, newPw);
      setOldPw("");
      setNewPw("");
      setAgain("");
      if (forced) {
        router.replace("/espace-bureau");
        router.refresh();
      } else {
        setDone(true);
        router.refresh();
      }
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "rate_limited") setMessage(waitMessage(err.retryAfter));
      else if (err.code === "unauthorized" && err.status === 401 && /ancien/i.test(err.message)) {
        setErrors({ old: forced ? "Mot de passe provisoire incorrect." : "Mot de passe actuel incorrect." });
        document.getElementById("pw-old")?.focus();
      } else if (err.code === "unauthorized") {
        router.replace("/espace-bureau/connexion");
      } else if (err.code === "validation_failed") {
        setErrors({ new: err.fields?.newPassword ?? err.fields?.password ?? err.message });
        document.getElementById("pw-new")?.focus();
      } else setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="mt-5 space-y-5">
      <TextField id="pw-old" label={forced ? "Mot de passe provisoire" : "Mot de passe actuel"} type="password"
        autoComplete="current-password" value={oldPw} onChange={setOldPw} error={errors.old} />
      <TextField id="pw-new" label="Nouveau mot de passe" type="password" autoComplete="new-password"
        hint={`Au moins ${MIN} caractères : une phrase courte fonctionne très bien.`}
        value={newPw} onChange={setNewPw} error={errors.new} />
      <TextField id="pw-again" label="Nouveau mot de passe, une seconde fois" type="password" autoComplete="new-password"
        value={again} onChange={setAgain} error={errors.again} />
      {message ? <Notice tone="error">{message}</Notice> : null}
      {done ? <Notice tone="success">Votre mot de passe a été changé.</Notice> : null}
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Enregistrement…" : forced ? "Choisir ce mot de passe" : "Changer mon mot de passe"}
      </Button>
    </form>
  );
}
