import { AppError } from "../content/errors";
import {
  BLOCKING_STATUSES,
  ROOMS,
  type ConflictItem,
  type Dashboard,
  type KeyHandover,
  type PublicSlot,
  type Reservation,
  type ReservationLite,
  type Room,
  type Status,
  type YesNo,
} from "./types";

/* ───────────── Dates (calcul sur le calendrier, sans fuseau ni heure d'été) ───────────── */

export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Nombre de jours calendaires entre deux dates (fin - début). */
export function daysBetween(start: string, end: string): number {
  const a = Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10));
  const b = Date.UTC(+end.slice(0, 4), +end.slice(5, 7) - 1, +end.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

/** Date du jour à Paris (AAAA-MM-JJ). */
export function todayParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

/* ───────────── Normalisation ───────────── */

const clean = (v: unknown, max = 500): string => String(v ?? "").trim().slice(0, max);

const STATUS_ALIASES: Record<string, Status> = {
  demande: "demande",
  requested: "demande",
  option: "option",
  confirmee: "confirmee",
  confirmed: "confirmee",
  annulee: "annulee",
  cancelled: "annulee",
  canceled: "annulee",
};

const fold = (v: unknown) =>
  clean(v).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Statut canonique, anciennes valeurs anglaises acceptées ; chaîne vide si inconnu. */
export function normalizeStatus(v: unknown): Status | "" {
  return STATUS_ALIASES[fold(v)] ?? "";
}

export function normalizeRooms(v: unknown): Room[] {
  const list = Array.isArray(v) ? v : [v];
  return [...new Set(list.map((x) => clean(x)).filter((x): x is Room => (ROOMS as readonly string[]).includes(x)))];
}

const yesNo = (v: unknown): YesNo | "" => {
  const s = v === true ? "oui" : v === false ? "non" : clean(v);
  return s === "oui" || s === "non" ? s : "";
};

/** Rend une réservation stockée (éventuellement ancienne : `date`, statuts anglais…) conforme au modèle. */
export function normalizeStored(raw: Record<string, unknown>): Reservation {
  const r = raw as Partial<Reservation> & { date?: string };
  const startDate = clean(r.startDate || r.date);
  const endDate = clean(r.endDate || r.startDate || r.date);
  const rooms = normalizeRooms(r.roomTypes);
  const status = normalizeStatus(r.status) || "demande";
  const out: Reservation = {
    id: clean(r.id),
    status,
    revision: Number(r.revision) > 0 ? Math.floor(Number(r.revision)) : 1,
    name: clean(r.name),
    address: clean(r.address),
    postalCity: clean(r.postalCity),
    email: clean(r.email),
    phone: clean(r.phone),
    purpose: clean(r.purpose),
    startDate,
    endDate,
    roomTypes: rooms.length ? rooms : ["grande", "petite"],
    keyHandover: r.keyHandover === "matin" ? "matin" : "veille",
    depositPaid: yesNo(r.depositPaid) || "non",
    balancePaid: yesNo(r.balancePaid) || "non",
    balanceAtKeys: yesNo(r.balanceAtKeys) || "non",
    publicVisible: r.publicVisible === true,
    createdAt: clean(r.createdAt) || new Date(0).toISOString(),
  };
  const title = clean(r.publicTitle, 100);
  if (title) out.publicTitle = title;
  if (r.updatedAt) out.updatedAt = clean(r.updatedAt);
  if (r.cancelledAt) out.cancelledAt = clean(r.cancelledAt);
  const before = normalizeStatus(r.statusBeforeCancellation);
  if (before && before !== "annulee") out.statusBeforeCancellation = before;
  return out;
}

/* ───────────── Validation d'une saisie ───────────── */

export type ReservationFields = Omit<
  Reservation,
  "id" | "status" | "revision" | "createdAt" | "updatedAt" | "cancelledAt" | "statusBeforeCancellation"
>;

const MAX_DAYS = 31;

/**
 * Valide les champs d'une saisie. `checkStartInPast` : à la création seulement
 * (une réservation existante reste modifiable après son début).
 */
export function parseFields(
  body: unknown,
  opts: { today: string; checkStartInPast: boolean },
): ReservationFields {
  if (!body || typeof body !== "object") throw new AppError("validation_failed", "Corps invalide.");
  const b = body as Record<string, unknown>;
  const f = {
    name: clean(b.name, 120),
    address: clean(b.address, 180),
    postalCity: clean(b.postalCity, 120),
    email: clean(b.email, 160),
    phone: clean(b.phone, 40),
    purpose: clean(b.purpose, 160),
    startDate: clean(b.startDate || b.date),
    endDate: clean(b.endDate || b.startDate || b.date),
    roomTypes: normalizeRooms(b.roomTypes),
    keyHandover: clean(b.keyHandover),
    depositPaid: yesNo(b.depositPaid),
    balancePaid: yesNo(b.balancePaid),
    balanceAtKeys: yesNo(b.balanceAtKeys),
    publicVisible: b.publicVisible === true || b.publicVisible === "true",
    publicTitle: clean(b.publicTitle, 100),
  };
  const errors: Record<string, string> = {};
  const required: [keyof typeof f, string][] = [
    ["name", "Nom"],
    ["phone", "Portable"],
    ["address", "Adresse"],
    ["postalCity", "Code postal / commune"],
    ["email", "Mail"],
    ["purpose", "Objet de la manifestation"],
    ["startDate", "Date de début"],
    ["endDate", "Date de fin"],
    ["depositPaid", "Acompte"],
    ["balancePaid", "Solde réglé"],
    ["balanceAtKeys", "Solde aux clés"],
  ];
  for (const [k, label] of required) if (!f[k]) errors[k] = `${label} : champ obligatoire.`;
  if (!f.roomTypes.length) errors.roomTypes = "Sélectionnez au moins une salle.";
  if (f.keyHandover !== "veille" && f.keyHandover !== "matin") errors.keyHandover = "Choisissez la remise des clés.";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errors.email = "Adresse mail invalide.";
  if (f.startDate && !isIsoDate(f.startDate)) errors.startDate = "Date invalide.";
  if (f.endDate && !isIsoDate(f.endDate)) errors.endDate = "Date invalide.";
  if (!errors.startDate && !errors.endDate && f.startDate && f.endDate) {
    if (opts.checkStartInPast && f.startDate < opts.today) {
      errors.startDate = "La date de début doit être aujourd'hui ou dans le futur.";
    } else if (f.endDate < f.startDate) {
      errors.endDate = "La date de fin doit être égale ou postérieure à la date de début.";
    } else if (daysBetween(f.startDate, f.endDate) + 1 > MAX_DAYS) {
      errors.endDate = `La réservation ne peut pas dépasser ${MAX_DAYS} jours.`;
    }
  }
  const keys = Object.keys(errors);
  if (keys.length) {
    throw new AppError("validation_failed", errors[keys[0]], { fields: errors });
  }
  const out: ReservationFields = {
    name: f.name,
    address: f.address,
    postalCity: f.postalCity,
    email: f.email,
    phone: f.phone,
    purpose: f.purpose,
    startDate: f.startDate,
    endDate: f.endDate,
    roomTypes: f.roomTypes,
    keyHandover: f.keyHandover as KeyHandover,
    depositPaid: f.depositPaid as YesNo,
    balancePaid: f.balancePaid as YesNo,
    balanceAtKeys: f.balanceAtKeys as YesNo,
    publicVisible: f.publicVisible,
  };
  if (f.publicTitle) out.publicTitle = f.publicTitle;
  return out;
}

/* ───────────── Conflits ───────────── */

export function isBlocking(status: Status): boolean {
  return BLOCKING_STATUSES.includes(status);
}

export function roomLabel(rooms: readonly string[] | undefined, short = false): string {
  const labels: Record<string, string> = short
    ? { grande: "Grande salle", petite: "Petite salle" }
    : { grande: "La grande salle", petite: "La petite salle" };
  return (rooms ?? []).map((r) => labels[r] ?? r).join(" + ");
}

/**
 * Réservations bloquantes qui chevauchent la période ET partagent au moins une salle.
 * Le résultat ne contient ni coordonnées ni paiements.
 */
export function findConflicts(
  all: readonly Reservation[],
  requested: Pick<Reservation, "startDate" | "endDate" | "roomTypes">,
  ignoredId = "",
): ConflictItem[] {
  return all
    .filter((x) => x.id !== ignoredId && isBlocking(x.status))
    .filter((x) => x.startDate <= requested.endDate && x.endDate >= requested.startDate)
    .map((x) => ({
      x,
      conflictingRooms: x.roomTypes.filter((r) => requested.roomTypes.includes(r)),
    }))
    .filter((c) => c.conflictingRooms.length)
    .map(({ x, conflictingRooms }) => ({
      id: x.id,
      status: x.status,
      purpose: x.purpose,
      name: x.name,
      startDate: x.startDate,
      endDate: x.endDate,
      roomTypes: x.roomTypes,
      conflictingRooms,
    }));
}

export function conflictMessage(conflicts: readonly ConflictItem[], fallback = "La salle est déjà réservée sur cette période."): string {
  const rooms = [...new Set(conflicts.flatMap((c) => c.conflictingRooms))];
  if (!rooms.length) return fallback;
  return `${rooms.map((r) => roomLabel([r])).join(" et ")} ${rooms.length > 1 ? "sont déjà réservées" : "est déjà réservée"} sur cette période.`;
}

/* ───────────── Recherche, tri, projections ───────────── */

export function compareReservations(a: Pick<Reservation, "startDate" | "id">, b: Pick<Reservation, "startDate" | "id">): number {
  return `${a.startDate} ${a.id}`.localeCompare(`${b.startDate} ${b.id}`);
}

export type Query = { month?: string; from?: string; to?: string; q?: string; room?: string; status?: string };

/** Filtre les réservations (période, texte, salle, statut). `fullSearch` : recherche aussi nom, téléphone, mail, commune. */
export function filterReservations(
  all: readonly Reservation[],
  query: Query,
  opts: { fullSearch: boolean },
): Reservation[] {
  let { from, to } = query;
  if (query.month) {
    const m = /^(\d{4})-(\d{2})$/.exec(query.month);
    if (!m || +m[2] < 1 || +m[2] > 12) throw new AppError("validation_failed", "Mois invalide.");
    from = `${m[1]}-${m[2]}-01`;
    to = addDays(`${+m[2] === 12 ? +m[1] + 1 : m[1]}-${String(+m[2] === 12 ? 1 : +m[2] + 1).padStart(2, "0")}-01`, -1);
  }
  if ((from && !isIsoDate(from)) || (to && !isIsoDate(to))) throw new AppError("validation_failed", "Période invalide.");
  if (from && to && from > to) throw new AppError("validation_failed", "La date de fin doit suivre la date de début.");
  const room = clean(query.room);
  if (room && !(ROOMS as readonly string[]).includes(room)) throw new AppError("validation_failed", "Salle invalide.");
  const rawStatus = clean(query.status);
  const status = rawStatus && rawStatus !== "all" ? normalizeStatus(rawStatus) : rawStatus;
  if (rawStatus && rawStatus !== "all" && !status) throw new AppError("validation_failed", "Statut invalide.");
  const q = fold(query.q);

  return all
    .filter((x) => (status === "all" ? true : status ? x.status === status : x.status !== "annulee"))
    .filter((x) => !from || x.endDate >= from)
    .filter((x) => !to || x.startDate <= to)
    .filter((x) => !room || x.roomTypes.includes(room as Room))
    .filter((x) => {
      if (!q) return true;
      const hay = opts.fullSearch ? [x.id, x.name, x.purpose, x.phone, x.email, x.postalCity] : [x.id, x.purpose];
      return hay.some((v) => fold(v).includes(q));
    })
    .sort(compareReservations);
}

/** Projection pour le droit de lecture : pas de coordonnées, pas de paiements. */
export function toLite(r: Reservation): ReservationLite {
  return { id: r.id, status: r.status, purpose: r.purpose, startDate: r.startDate, endDate: r.endDate, roomTypes: r.roomTypes };
}

export function project<T extends Reservation>(r: T, canWrite: boolean): Reservation | ReservationLite {
  return canWrite ? r : toLite(r);
}

/**
 * Projection publique pour un futur agenda : titre, dates et salles seulement,
 * uniquement les réservations confirmées marquées `publicVisible`. NON exposée
 * par une route ou une page pour l'instant.
 */
export function projectPublic(all: readonly Reservation[], from?: string): PublicSlot[] {
  return all
    .filter((r) => r.publicVisible && r.status === "confirmee")
    .filter((r) => !from || r.endDate >= from)
    .sort(compareReservations)
    .map((r) => ({
      id: r.id,
      title: r.publicTitle || r.purpose,
      startDate: r.startDate,
      endDate: r.endDate,
      rooms: r.roomTypes,
    }));
}

export function keyHandoverDate(r: Pick<Reservation, "startDate" | "keyHandover">): string {
  return r.keyHandover === "veille" ? addDays(r.startDate, -1) : r.startDate;
}

export function buildDashboard(all: readonly Reservation[], today: string, canWrite: boolean, now = new Date()): Dashboard {
  const limit = addDays(today, 30);
  const active = all.filter((r) => isBlocking(r.status));
  const upcomingAll = active.filter((r) => r.endDate >= today).sort(compareReservations);
  const paymentsDue = upcomingAll.filter((r) => r.depositPaid !== "oui" || r.balancePaid !== "oui");
  const keys = active
    .map((r) => ({ ...r, keyHandoverDate: keyHandoverDate(r) }))
    .filter((r) => r.keyHandoverDate >= today && r.keyHandoverDate <= limit)
    .sort((a, b) => a.keyHandoverDate.localeCompare(b.keyHandoverDate));
  const byStatus: Record<Status, number> = { demande: 0, option: 0, confirmee: 0, annulee: 0 };
  all.forEach((r) => (byStatus[r.status] += 1));
  return {
    generatedAt: now.toISOString(),
    counts: { upcoming: upcomingAll.length, paymentsDue: canWrite ? paymentsDue.length : 0, keyHandovers: keys.length, byStatus },
    upcoming: upcomingAll.slice(0, 12).map((r) => project(r, canWrite)),
    paymentsDue: canWrite ? paymentsDue : [],
    keyHandovers: keys.map((r) => ({ ...project(r, canWrite), keyHandoverDate: r.keyHandoverDate })),
  };
}

/* ───────────── Exports ───────────── */

/** Protection contre l'injection de formule : préfixe d'une apostrophe. */
export function csvCell(value: unknown): string {
  let text = String(value ?? "").replaceAll('"', '""');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text}"`;
}

export function makeCsv(items: readonly (Reservation | ReservationLite)[]): string {
  const cols: [string, string][] = [
    ["ID", "id"], ["Statut", "status"], ["Du", "startDate"], ["Au", "endDate"], ["Salle(s)", "roomTypes"],
    ["Objet", "purpose"], ["Nom", "name"], ["Téléphone", "phone"], ["Mail", "email"], ["Adresse", "address"],
    ["Commune", "postalCity"], ["Acompte versé", "depositPaid"], ["Solde réglé", "balancePaid"], ["Solde aux clés", "balanceAtKeys"],
  ];
  const row = (vals: unknown[]) => vals.map(csvCell).join(";");
  return `﻿${[
    row(cols.map(([l]) => l)),
    ...items.map((it) =>
      row(cols.map(([, k]) => (k === "roomTypes" ? roomLabel(it.roomTypes, true) : (it as unknown as Record<string, unknown>)[k]))),
    ),
  ].join("\r\n")}\r\n`;
}

export function icsEscape(v: unknown): string {
  return String(v ?? "").replaceAll("\\", "\\\\").replaceAll(";", "\;").replaceAll(",", "\\,").replace(/\r?\n/g, "\\n");
}

function foldIcsLine(line: string): string[] {
  const chunks: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 73) {
    let i = Math.min(rest.length, 73);
    while (i > 1 && Buffer.byteLength(rest.slice(0, i), "utf8") > 73) i -= 1;
    chunks.push(rest.slice(0, i));
    rest = ` ${rest.slice(i)}`;
  }
  chunks.push(rest);
  return chunks;
}

export function makeICalendar(items: readonly (Reservation | ReservationLite)[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mairie de Succieu//Salle des fetes//FR", "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH", "X-WR-CALNAME:Salle des fêtes de Succieu",
  ];
  for (const it of items) {
    const stampSrc = (it as Reservation).updatedAt || (it as Reservation).createdAt || now.toISOString();
    const stamp = stampSrc.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${icsEscape(it.id)}@succieu.fr`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${it.startDate.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${addDays(it.endDate, 1).replaceAll("-", "")}`,
      `SUMMARY:${icsEscape(it.purpose || "Réservation salle des fêtes")}`,
      `LOCATION:${icsEscape(`${roomLabel(it.roomTypes, true)} - Salle des fêtes de Succieu`)}`,
      `DESCRIPTION:${icsEscape(`Statut: ${it.status}\nRéférence: ${it.id}`)}`,
      it.status === "annulee" ? "STATUS:CANCELLED" : it.status === "confirmee" ? "STATUS:CONFIRMED" : "STATUS:TENTATIVE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.flatMap(foldIcsLine).join("\r\n")}\r\n`;
}
