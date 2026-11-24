"use client";

import { useState, type ReactNode } from "react";
import { Button, Notice, TextField, focusRing } from "@/components/bureau/fields";
import { ApiError, call } from "@/components/bureau/api";
import { addDays, roomLabel, todayParis } from "@/lib/salle-des-fetes/logic";
import type { AuditEvent, ConflictItem, Reservation, Room } from "@/lib/salle-des-fetes/types";
import { AUDIT_LABEL, fullRange } from "./format";
import { Modal, ModalHeader } from "./Modal";

type Form = {
  name: string; phone: string; address: string; postalCity: string; email: string;
  startDate: string; endDate: string; status: string; purpose: string; roomTypes: Room[];
  keyHandover: string; depositPaid: string; balancePaid: string; balanceAtKeys: string;
  publicVisible: boolean; publicTitle: string;
};

function initial(r: Reservation | null): Form {
  const t = todayParis();
  return {
    name: r?.name ?? "", phone: r?.phone ?? "", address: r?.address ?? "", postalCity: r?.postalCity ?? "", email: r?.email ?? "",
    startDate: r?.startDate ?? t, endDate: r?.endDate ?? t, status: r?.status ?? "demande", purpose: r?.purpose ?? "",
    roomTypes: r?.roomTypes ?? [], keyHandover: r?.keyHandover ?? "", depositPaid: r?.depositPaid ?? "", balancePaid: r?.balancePaid ?? "",
    balanceAtKeys: r?.balanceAtKeys ?? "", publicVisible: r?.publicVisible ?? false, publicTitle: r?.publicTitle ?? "",
  };
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="mt-5 rounded-xl border border-border-subtle p-4">
      <legend className="px-2 font-display text-lg font-bold">{legend}</legend>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

function Choice({ legend, name, value, onChange, options, error }: {
  legend: string; name: string; value: string; onChange: (v: string) => void; options: [string, string][]; error?: string;
}) {
  return (
    <div role="radiogroup" aria-label={legend}>
      <span className="block text-[0.95rem] font-semibold">{legend}</span>
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <label key={v} className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-ink-subtle/50 px-4 ${value === v ? "bg-pre-pale" : "bg-surface"}`}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="h-5 w-5 accent-[var(--color-moss-dark)]" />
            {l}
          </label>
        ))}
      </div>
      {error ? <p className="mt-1 text-sm font-medium" style={{ color: "#9c3a22" }}>{error}</p> : null}
    </div>
  );
}

export function ReservationForm({ reservation, audit, onClose, onSaved, onHistory }: {
  reservation: Reservation | null;
  audit?: AuditEvent[];
  onClose: () => void;
  onSaved: (r: Reservation) => void;
  onHistory?: () => void;
}) {
  const editing = reservation !== null;
  const cancelled = reservation?.status === "annulee";
  const [f, setF] = useState<Form>(() => initial(reservation));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  async function run(action: () => Promise<{ reservation: Reservation }>) {
    setBusy(true);
    setError("");
    setFields({});
    setConflicts([]);
    try {
      onSaved((await action()).reservation);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message + (e.code === "stale_revision" ? " (fermez puis rouvrez la réservation)" : ""));
        setFields(e.fields ?? {});
        setConflicts(((e.details?.conflicts as ConflictItem[] | undefined) ?? []));
      } else setError("Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() =>
      call(
        editing ? `/api/salle-des-fetes/reservations/${encodeURIComponent(reservation!.id)}` : "/api/salle-des-fetes/reservations",
        json(editing ? "PUT" : "POST", { ...f, ...(editing ? { revision: reservation!.revision } : {}) }),
      ),
    );
  };
  const cancelOrRestore = () => {
    const msg = cancelled ? "Restaurer cette réservation dans le planning actif ?" : "Annuler cette réservation ? Elle restera disponible dans l’historique.";
    if (!window.confirm(msg)) return;
    const base = `/api/salle-des-fetes/reservations/${encodeURIComponent(reservation!.id)}`;
    void run(() => (cancelled ? call(`${base}/restore`, json("POST", { revision: reservation!.revision })) : call(base, json("DELETE"))));
  };

  const toggleRoom = (r: Room) => set("roomTypes", f.roomTypes.includes(r) ? f.roomTypes.filter((x) => x !== r) : [...f.roomTypes, r]);
  const err = (k: string) => fields[k];

  return (
    <Modal labelledBy="sdf-form-title" onClose={onClose}>
      <ModalHeader id="sdf-form-title" kicker="Gestion du planning" title={editing ? "Modifier la réservation" : "Ajouter une réservation"} onClose={onClose} />
      <form onSubmit={save} noValidate>
        {error ? <Notice tone="error">{error}</Notice> : null}
        {conflicts.length ? (
          <section className="mt-3 rounded-xl border border-tuile/50 bg-tuile-pale p-4" role="alert" aria-labelledby="sdf-conflict-title">
            <h3 id="sdf-conflict-title" className="font-semibold">Cette réservation entre en conflit avec le planning</h3>
            <p className="text-sm">Modifiez les dates ou les salles avant de valider.</p>
            <ul className="mt-2 space-y-1">
              {conflicts.map((c) => (
                <li key={c.id} className="rounded-lg bg-surface px-3 py-2">
                  <strong>{c.purpose || c.name || "Réservation existante"}</strong>
                  <br />
                  <span className="text-sm text-ink-muted">{[fullRange(c.startDate, c.endDate), roomLabel(c.conflictingRooms)].join(" · ")}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Group legend="Demandeur">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="name" label="Nom" value={f.name} onChange={(v) => set("name", v)} required error={err("name")} />
            <TextField id="phone" label="Portable" value={f.phone} onChange={(v) => set("phone", v)} required error={err("phone")} />
          </div>
          <TextField id="address" label="Adresse" value={f.address} onChange={(v) => set("address", v)} required error={err("address")} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="postalCity" label="Code postal / commune" value={f.postalCity} onChange={(v) => set("postalCity", v)} required error={err("postalCity")} />
            <TextField id="email" label="Mail" value={f.email} onChange={(v) => set("email", v)} required error={err("email")} />
          </div>
        </Group>

        <Group legend="Dates">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="startDate" label="Du" type="date" value={f.startDate} required error={err("startDate")}
              onChange={(v) => setF((p) => ({ ...p, startDate: v, endDate: !p.endDate || p.endDate < v ? v : p.endDate }))} />
            <TextField id="endDate" label="Au" type="date" value={f.endDate} onChange={(v) => set("endDate", v)} required error={err("endDate")} />
          </div>
          {f.startDate && f.endDate >= f.startDate && f.endDate > addDays(f.startDate, 30) ? <p className="text-sm text-ink-muted">Maximum 31 jours.</p> : null}
        </Group>

        <Group legend="Informations de réservation">
          <div>
            <label htmlFor="status" className="block text-[0.95rem] font-semibold">Statut de la réservation</label>
            <select id="status" value={f.status} onChange={(e) => set("status", e.target.value)}
              className={`mt-1.5 block w-full rounded-xl border border-ink-subtle/60 bg-surface px-3.5 py-3 text-base ${focusRing}`}>
              <option value="demande">Demande</option>
              <option value="option">Option</option>
              <option value="confirmee">Confirmée</option>
              <option value="annulee">Annulée</option>
            </select>
          </div>
          <TextField id="purpose" label="Objet de la manifestation" value={f.purpose} onChange={(v) => set("purpose", v)} required error={err("purpose")}
            hint="Mariage, anniversaire, réunion, association, repas…" />
          <fieldset>
            <legend className="text-[0.95rem] font-semibold">Type de salle réservée</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {(["grande", "petite"] as Room[]).map((r) => (
                <label key={r} className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-ink-subtle/50 px-4 ${f.roomTypes.includes(r) ? "bg-pre-pale" : "bg-surface"}`}>
                  <input type="checkbox" checked={f.roomTypes.includes(r)} onChange={() => toggleRoom(r)} className="h-5 w-5 accent-[var(--color-moss-dark)]" />
                  {r === "grande" ? "Grande salle" : "Petite salle"}
                </label>
              ))}
            </div>
            {err("roomTypes") ? <p className="mt-1 text-sm font-medium" style={{ color: "#9c3a22" }}>{err("roomTypes")}</p> : null}
          </fieldset>
          <Choice legend="Remise des clés" name="keyHandover" value={f.keyHandover} onChange={(v) => set("keyHandover", v)} error={err("keyHandover")}
            options={[["veille", "La veille"], ["matin", "Le matin même"]]} />
        </Group>

        <Group legend="Règlement de la location">
          {([["depositPaid", "Acompte versé à la mairie"], ["balancePaid", "Solde réglé auprès de la mairie"], ["balanceAtKeys", "Solde à récupérer lors de la remise des clés"]] as const).map(([k, l]) => (
            <Choice key={k} legend={l} name={k} value={f[k]} onChange={(v) => set(k, v)} error={err(k)} options={[["oui", "Oui"], ["non", "Non"]]} />
          ))}
        </Group>

        <Group legend="Agenda public (préparation)">
          <label className="flex min-h-12 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={f.publicVisible} onChange={(e) => set("publicVisible", e.target.checked)} className="h-5 w-5 accent-[var(--color-moss-dark)]" />
            <span>Pourra apparaître dans l’agenda public (aucune page publique pour l’instant)</span>
          </label>
          <TextField id="publicTitle" label="Titre public" optional value={f.publicTitle} onChange={(v) => set("publicTitle", v)}
            hint="Sans nom de particulier. À défaut, l’objet de la manifestation serait utilisé." />
        </Group>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {editing && onHistory ? <Button type="button" variant="ghost" onClick={onHistory}>{audit ? "Historique affiché ci-dessous" : "Voir l’historique"}</Button> : null}
          {editing ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={cancelOrRestore} className="border-tuile/60 text-tuile">
              {cancelled ? "Restaurer la réservation" : "Annuler la réservation"}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onClose}>Fermer</Button>
          <Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Ajouter la réservation"}</Button>
        </div>
      </form>
      {audit?.length ? (
        <section className="mt-6" aria-labelledby="sdf-form-audit">
          <h3 id="sdf-form-audit" className="font-display text-lg font-bold">Historique des modifications</h3>
          <ol className="mt-2 space-y-2">
            {audit.map((e) => (
              <li key={e.id} className="rounded-xl bg-canvas px-3 py-2">
                <strong>{AUDIT_LABEL[e.action] ?? "Modification"}</strong>
                <br />
                <span className="text-ink-muted">{e.actor} · {new Date(e.at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </Modal>
  );
}
