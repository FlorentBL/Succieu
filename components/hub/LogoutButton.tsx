"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/bureau/fields";
import { hubLogout } from "./api";

export function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function out() {
    setBusy(true);
    try {
      await hubLogout();
    } catch {
      /* cookie déjà invalide : on repart à la connexion quoi qu'il arrive */
    }
    router.replace("/espace-bureau/connexion");
    router.refresh();
  }
  return (
    <Button type="button" variant="ghost" onClick={out} disabled={busy} className={className}>
      {busy ? "Déconnexion…" : "Se déconnecter"}
    </Button>
  );
}
