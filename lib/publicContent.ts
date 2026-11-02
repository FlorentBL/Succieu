import { getPublishedArticles, getUpcomingEvents, listSubmissions, todayParis } from "@/lib/content/store";
import type { EventFields, PublishedArticle } from "@/lib/content/types";
import { homeSpotlightItems, type HomeSpotlightItem } from "@/lib/homeSpotlight";

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const SHORT_MONTHS = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** « 8 juin 2026 » */
export function formatDate(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${d === 1 ? "1er" : d} ${MONTHS[m - 1]} ${y}`;
}

/** « samedi 8 juin » */
export function formatDayLong(iso: string): string {
  const { m, d, weekday } = parts(iso);
  return `${WEEKDAYS[weekday]} ${d === 1 ? "1er" : d} ${MONTHS[m - 1]}`;
}

export const dayNumber = (iso: string) => parts(iso).d;
export const shortMonth = (iso: string) => SHORT_MONTHS[parts(iso).m - 1];
export const monthKey = (iso: string) => iso.slice(0, 7);

/** « juin 2026 » */
export function monthLabel(iso: string): string {
  const { y, m } = parts(iso);
  return `${MONTHS[m - 1]} ${y}`;
}

const hhmm = (t: string) => t.replace(/^0/, "").replace(":", " h ").replace(/ h 00$/, " h");

export function formatTimeRange(start?: string, end?: string): string | undefined {
  if (!start) return undefined;
  return end ? `${hhmm(start)} – ${hhmm(end)}` : hhmm(start);
}

export function articleImageUrl(image: string): string {
  return `/api/uploads/${image}`;
}

/** Un rendez-vous affiché dans la bande d'accueil ou l'agenda. */
export type AgendaItem = {
  id: string;
  date: string;
  title: string;
  time?: string;
  place?: string;
  description?: string;
  href?: string;
  market?: boolean;
};

function addDays(iso: string, n: number): string {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Prochain samedi (aujourd'hui si c'est samedi et que la matinée n'est pas passée), heure de Paris. */
export function nextMarketDate(now = new Date()): string {
  const today = todayParis(now);
  const hour = Number(
    new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(now),
  );
  const wd = parts(today).weekday;
  if (wd === 6) return hour < 13 ? today : addDays(today, 7);
  return addDays(today, (6 - wd + 7) % 7);
}

export async function getAgenda(now = new Date()): Promise<AgendaItem[]> {
  const events = await getUpcomingEvents(todayParis(now));
  const items: AgendaItem[] = events.map((e) => ({
    id: e.id,
    date: e.fields.date,
    title: e.fields.title,
    time: formatTimeRange(e.fields.startTime, e.fields.endTime),
    place: e.fields.place,
    description: e.fields.description,
    href: e.fields.linkUrl,
  }));
  const marketDate = nextMarketDate(now);
  items.push({
    id: "marche-" + marketDate,
    date: marketDate,
    title: "Marché de Succieu",
    time: "Le matin",
    market: true,
  });
  // Tri stable : à date égale, le marché passe avant les rendez-vous horodatés.
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => a.it.date.localeCompare(b.it.date) || (a.it.market ? -1 : b.it.market ? 1 : a.i - b.i))
    .map((x) => x.it);
}

export function articleToSpotlight(a: PublishedArticle): HomeSpotlightItem {
  return {
    id: a.id,
    meta: formatDate(a.publishedAt),
    title: a.fields.title,
    body: a.fields.summary,
    href: `/actualites/${a.id}`,
    cta: "Lire la suite",
  };
}

/** 4 dernières actualités publiées, complétées par les encarts statiques. */
export async function getHomeSpotlight(max = 4): Promise<HomeSpotlightItem[]> {
  const articles = await getPublishedArticles(max);
  const items = articles.map(articleToSpotlight);
  for (const s of homeSpotlightItems) {
    if (items.length >= max) break;
    items.push(s);
  }
  return items;
}

/** Rendez-vous publiés déjà passés, du plus récent au plus ancien. */
export async function getPastEvents(now = new Date()): Promise<AgendaItem[]> {
  const today = todayParis(now);
  const subs = await listSubmissions({ kind: "event", status: "published" });
  return subs
    .flatMap((s) => (s.published && s.kind === "event" ? [{ s, f: s.published.fields as EventFields }] : []))
    .filter(({ f }) => f.date < today)
    .sort((a, b) => b.f.date.localeCompare(a.f.date))
    .map(({ s, f }) => ({
      id: s.id,
      date: f.date,
      title: f.title,
      time: formatTimeRange(f.startTime, f.endTime),
      place: f.place,
      description: f.description,
      href: f.linkUrl,
    }));
}
