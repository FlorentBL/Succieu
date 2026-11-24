"use client";

import type { AuditEvent } from "@/lib/salle-des-fetes/types";
import { roomLabel } from "@/lib/salle-des-fetes/logic";
import { AUDIT_LABEL, fullRange, statusLabel, type Item } from "./format";
import { Modal, ModalHeader } from "./Modal";

const yn = (v?: string) => (v ? (v === "oui" ? "Oui" : "Non") : "");

/** Détail d'une réservation (lecture seule : les champs personnels sont simplement absents). */
export function DetailsDialog({ item, audit, onClose }: { item: Item; audit?: AuditEvent[]; onClose: () => void }) {
  const rows: [string, string][] = (
    [
      ["Statut", statusLabel(item.status)],
      ["Dates", fullRange(item.startDate, item.endDate)],
      ["Salle", roomLabel(item.roomTypes, true)],
      ["Demandeur", item.name ?? ""],
      ["Téléphone", item.phone ?? ""],
      ["Courriel", item.email ?? ""],
      ["Adresse", [item.address, item.postalCity].filter(Boolean).join(", ")],
      ["Remise des clés", item.keyHandover ? (item.keyHandover === "matin" ? "Le matin même" : "La veille") : ""],
      ["Acompte versé", yn(item.depositPaid)],
      ["Solde réglé", yn(item.balancePaid)],
      ["Solde aux clés", yn(item.balanceAtKeys)],
    ] as [string, string][]
  ).filter(([, v]) => v);
  return (
    <Modal labelledBy="sdf-details-title" onClose={onClose}>
      <ModalHeader id="sdf-details-title" kicker="Détail de la réservation" title={item.purpose || "Réservation"} onClose={onClose} />
      <dl className="divide-y divide-border-subtle">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[11rem_1fr]">
            <dt className="font-semibold text-ink-muted">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {audit?.length ? (
        <section className="mt-5" aria-labelledby="sdf-audit-title">
          <h3 id="sdf-audit-title" className="font-display text-lg font-bold">
            Historique des modifications
          </h3>
          <ol className="mt-2 space-y-2">
            {audit.map((e) => (
              <li key={e.id} className="rounded-xl bg-canvas px-3 py-2">
                <strong>{AUDIT_LABEL[e.action] ?? "Modification"}</strong>
                <br />
                <span className="text-ink-muted">
                  {[e.actor, new Date(e.at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </Modal>
  );
}
