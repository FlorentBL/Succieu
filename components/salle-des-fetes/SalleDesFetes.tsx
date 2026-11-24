"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, focusRing } from "@/components/bureau/fields";
import { call } from "@/components/bureau/api";
import { roomLabel } from "@/lib/salle-des-fetes/logic";
import type { AuditEvent, Dashboard, Reservation } from "@/lib/salle-des-fetes/types";
import { DetailsDialog } from "./DetailsDialog";
import { ReservationForm } from "./ReservationForm";
import { compactRange, isoOf, parseIso, statusClass, statusLabel, title, type Item } from "./format";

const API = "/api/salle-des-fetes";
const FILTERS_KEY = "sdf-agenda-filters";
type Filters = { q: string; status: string; room: string };
type DView = "upcoming" | "payments" | "keys";
const ctl = `min-h-12 rounded-xl border border-ink-subtle/60 bg-surface px-3.5 text-base ${focusRing}`;
const linkBtn = `inline-flex min-h-12 items-center justify-center rounded-full border border-ink-subtle/50 bg-surface px-5 font-semibold hover:bg-pre-pale ${focusRing}`;

function monthStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function SalleDesFetes({ canWrite }: { canWrite: boolean }) {
  const [month, setMonth] = useState(monthStart);
  const [filters, setFilters] = useState<Filters>({ q: "", status: "", room: "" });
  const [items, setItems] = useState<Item[]>([]);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [dView, setDView] = useState<DView>("upcoming");
  const [feedback, setFeedback] = useState("");
  const [updated, setUpdated] = useState("");
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<{ item: Item; audit?: AuditEvent[] } | null>(null);
  const [form, setForm] = useState<{ reservation: Reservation | null; audit?: AuditEvent[] } | null>(null);
  const [restored, setRestored] = useState(false);
  const reqId = useRef(0);
  const formOpen = useRef(false);
  formOpen.current = form !== null || details !== null;

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const params = new URLSearchParams({ month: monthKey });
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.room) params.set("room", filters.room);
  const qs = params.toString();

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(FILTERS_KEY) || "{}");
      setFilters({ q: saved.q || "", status: saved.status || "", room: saved.room || "" });
    } catch { /* stockage indisponible */ }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try { window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters)); } catch { /* ignoré */ }
  }, [filters, restored]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setFeedback((f) => f || "Chargement du planning…");
    try {
      const data = await call<{ reservations: Item[] }>(`${API}/reservations?${qs}`);
      if (id !== reqId.current) return;
      setItems(data.reservations);
      setFeedback("");
      setUpdated(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      if (canWrite) setDash(await call<Dashboard>(`${API}/dashboard`).catch(() => null));
    } catch (e) {
      if (id === reqId.current) setFeedback(e instanceof Error ? e.message : "Planning indisponible");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [qs, canWrite]);

  useEffect(() => {
    if (!restored) return;
    const t = window.setTimeout(() => void load(), filters.q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [load, restored, filters.q]);
  useEffect(() => {
    // Actualisation périodique, suspendue pendant une saisie ou un détail ouvert.
    const tick = () => { if (!formOpen.current && !document.hidden) void load(); };
    const iv = window.setInterval(tick, 30_000);
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(iv); window.removeEventListener("focus", tick); };
  }, [load]);

  async function open(item: Item) {
    setFeedback("Chargement de la réservation…");
    try {
      const { reservation } = await call<{ reservation: Item }>(`${API}/reservations/${encodeURIComponent(item.id)}`);
      setFeedback("");
      if (canWrite) setForm({ reservation: reservation as Reservation });
      else setDetails({ item: reservation });
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Réservation introuvable");
    }
  }

  async function history() {
    if (!form?.reservation) return;
    try {
      const { events } = await call<{ events: AuditEvent[] }>(`${API}/audit?reservationId=${encodeURIComponent(form.reservation.id)}&limit=100`);
      setForm({ ...form, audit: events });
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Historique indisponible");
    }
  }

  const days = (() => {
    const first = month.getDay();
    const lead = (first + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const trail = (7 - ((lead + count) % 7)) % 7;
    return { lead, count, trail };
  })();
  const today = isoOf(new Date());
  const monthTitle = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const forDay = (iso: string) => items.filter((i) => i.startDate <= iso && i.endDate >= iso);
  const sorted = [...items].sort((a, b) => a.startDate.localeCompare(b.startDate));

  const dItems: (Item & { keyHandoverDate?: string })[] = dash ? (dView === "upcoming" ? dash.upcoming : dView === "payments" ? dash.paymentsDue : dash.keyHandovers) : [];
  const payNote = (i: Item) => (i.depositPaid !== "oui" ? "Acompte à suivre" : i.balancePaid !== "oui" ? "Solde à suivre" : "Paiement à contrôler");

  return (
    <div>
      <style>{`@media print{header,footer,nav,[data-noprint]{display:none!important}dialog{display:none!important}}`}</style>

      {!canWrite ? (
        <p className="mb-4 rounded-xl border border-colza bg-colza-pale px-4 py-3" data-noprint>
          Consultation seule : vous pouvez voir le planning, sans les coordonnées ni les paiements.
        </p>
      ) : null}

      {canWrite ? (
        <section className="mb-6" aria-labelledby="sdf-dash" data-noprint>
          <h2 id="sdf-dash" className="font-display text-xl font-bold">Tableau de bord</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {([["upcoming", "prochaines réservations", dash?.counts.upcoming], ["payments", "paiements à suivre", dash?.counts.paymentsDue], ["keys", "remises de clés à prévoir (30 jours)", dash?.counts.keyHandovers]] as const).map(([k, l, n]) => (
              <button key={k} type="button" aria-pressed={dView === k} onClick={() => setDView(k)}
                className={`rounded-2xl border p-4 text-left ${focusRing} ${dView === k ? "border-moss-dark bg-pre-pale" : "border-border-subtle bg-surface hover:bg-canvas"}`}>
                <strong className="block font-display text-3xl">{n ?? "—"}</strong>
                <span>{l}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2" aria-live="polite">
            {!dItems.length ? <p className="text-ink-muted">Aucun élément à suivre.</p> : null}
            {dItems.slice(0, 6).map((i) => (
              <button key={i.id} type="button" onClick={() => void open(i)}
                className={`flex min-h-12 w-full flex-wrap items-center gap-x-3 rounded-xl border border-border-subtle bg-surface px-4 py-2 text-left hover:bg-canvas ${focusRing}`}>
                <span className="text-ink-muted">{dView === "keys" && i.keyHandoverDate ? compactRange(i.keyHandoverDate, i.keyHandoverDate) : compactRange(i.startDate, i.endDate)}</span>
                <strong>{title(i)}</strong>
                <span className="text-ink-muted">{dView === "payments" ? payNote(i) : roomLabel(i.roomTypes, true)}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3" data-noprint>
        <div>
          <h2 className="font-display text-2xl font-bold first-letter:uppercase">{monthTitle}</h2>
          <span className="text-sm text-ink-muted">{updated ? `Mis à jour à ${updated}` : "Agenda partagé"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={`${linkBtn} w-12 px-0 text-2xl`} aria-label="Mois précédent" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
          <button type="button" className={linkBtn} onClick={() => setMonth(monthStart())}>Aujourd’hui</button>
          <button type="button" className={`${linkBtn} w-12 px-0 text-2xl`} aria-label="Mois suivant" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
          <button type="button" className={linkBtn} disabled={loading} onClick={() => void load()}><span aria-hidden="true">↻&nbsp;</span>Actualiser</button>
          {canWrite ? <Button type="button" onClick={() => setForm({ reservation: null })}><span aria-hidden="true">＋</span> Ajouter une réservation</Button> : null}
        </div>
      </div>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end" data-noprint>
        <label className="block"><span className="block text-[0.95rem] font-semibold">Rechercher</span>
          <input type="search" value={filters.q} autoComplete="off" onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder={canWrite ? "Nom, téléphone ou objet…" : "Objet…"} className={`${ctl} mt-1.5 w-full`} /></label>
        <label className="block"><span className="block text-[0.95rem] font-semibold">Statut</span>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={`${ctl} mt-1.5 w-full`}>
            <option value="">Réservations actives</option><option value="all">Tous les statuts</option><option value="demande">Demandes</option>
            <option value="option">Options</option><option value="confirmee">Confirmées</option><option value="annulee">Annulées / corbeille</option>
          </select></label>
        <label className="block"><span className="block text-[0.95rem] font-semibold">Salle</span>
          <select value={filters.room} onChange={(e) => setFilters({ ...filters, room: e.target.value })} className={`${ctl} mt-1.5 w-full`}>
            <option value="">Toutes les salles</option><option value="grande">Grande salle</option><option value="petite">Petite salle</option>
          </select></label>
        <Button type="button" variant="ghost" onClick={() => setFilters({ q: "", status: "", room: "" })}>Effacer</Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2" aria-label="Exporter ou imprimer le planning" data-noprint>
        <a className={linkBtn} href={`${API}/reservations/export.csv?${qs}`}>Exporter CSV</a>
        <a className={linkBtn} href={`${API}/reservations/export.ics?${qs}`}>Ajouter au calendrier</a>
        <button type="button" className={linkBtn} onClick={() => window.print()}>Imprimer / PDF</button>
      </div>

      <p role="status" className="mt-3 min-h-6 text-ink-muted">{feedback}</p>

      <div className="mt-1 hidden md:block">
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-ink-muted">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: days.lead }, (_, i) => <div key={`l${i}`} aria-hidden="true" className="rounded-lg bg-canvas/60" />)}
          {Array.from({ length: days.count }, (_, i) => {
            const date = new Date(month.getFullYear(), month.getMonth(), i + 1);
            const iso = isoOf(date);
            return (
              <div key={iso} className={`min-h-28 rounded-lg border p-1.5 ${iso === today ? "border-moss-dark bg-pre-pale" : "border-border-subtle bg-surface"}`}>
                <span className="text-sm font-semibold" aria-label={date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}>{i + 1}</span>
                <div className="mt-1 space-y-1">
                  {forDay(iso).map((it) => (
                    <button key={it.id} type="button" onClick={() => void open(it)} title={`${title(it)} — ${roomLabel(it.roomTypes, true)}`}
                      className={`block w-full rounded-md border-l-4 px-1.5 py-1 text-left text-xs ${statusClass(it.status)} ${focusRing}`}>
                      <strong className="block truncate">{it.purpose || "Réservation"}</strong>
                      <small className="block truncate">{[statusLabel(it.status), it.name, roomLabel(it.roomTypes, true)].filter(Boolean).join(" · ")}</small>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {Array.from({ length: days.trail }, (_, i) => <div key={`t${i}`} aria-hidden="true" className="rounded-lg bg-canvas/60" />)}
        </div>
      </div>

      <section className="mt-6 md:mt-8 print:hidden" aria-labelledby="sdf-list">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="sdf-list" className="font-display text-lg font-bold">Réservations du mois</h3>
          <span className="text-ink-muted">{sorted.length} {sorted.length > 1 ? "réservations" : "réservation"}</span>
        </div>
        <div className="mt-2 space-y-2 md:hidden">
          {!sorted.length ? <p className="text-ink-muted">Aucune réservation ce mois-ci.</p> : null}
          {sorted.map((it) => (
            <button key={it.id} type="button" onClick={() => void open(it)}
              className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-l-4 px-3 py-2 text-left ${statusClass(it.status)} ${focusRing}`}>
              <span className="w-24 shrink-0 font-semibold">{compactRange(it.startDate, it.endDate)}</span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate">{title(it)}</strong>
                <small className="block text-ink-muted">{[statusLabel(it.status), roomLabel(it.roomTypes, true), it.name].filter(Boolean).join(" · ")}</small>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </section>

      {details ? <DetailsDialog item={details.item} audit={details.audit} onClose={() => setDetails(null)} /> : null}
      {form ? (
        <ReservationForm
          key={form.reservation ? `${form.reservation.id}-${form.reservation.revision}` : "new"}
          reservation={form.reservation}
          audit={form.audit}
          onHistory={() => void history()}
          onClose={() => setForm(null)}
          onSaved={(r) => {
            setForm(null);
            setMonth(monthStart(parseIso(r.startDate)));
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
