import { randomBytes } from "node:crypto";
import { AppError } from "./errors";
import { imageExists } from "./images";
import { dataPath, readJson, updateJson } from "./storage";
import { applyPublish, applyReject, applyReview } from "./transitions";
import type {
  ArticleFields,
  ArticleSubmission,
  EventFields,
  EventSubmission,
  PublishedArticle,
  PublishedEvent,
  PublishedVersion,
  Submission,
  SubmissionKind,
  SubmissionStatus,
} from "./types";
import { parseFields, type ReviewInput } from "./validation";

const FILES: Record<SubmissionKind, string> = {
  article: "articles.json",
  event: "events.json",
};
const PREFIX: Record<SubmissionKind, string> = { article: "a-", event: "e-" };

function file(kind: SubmissionKind): string {
  return dataPath(FILES[kind]);
}

function kindOfId(id: string): SubmissionKind {
  if (/^a-[a-f0-9]{16}$/.test(id)) return "article";
  if (/^e-[a-f0-9]{16}$/.test(id)) return "event";
  throw new AppError("not_found", "Saisie introuvable.");
}

async function readAll(kind: SubmissionKind): Promise<Submission[]> {
  const v = await readJson<unknown>(file(kind), []);
  return Array.isArray(v) ? (v as Submission[]) : [];
}

export async function listSubmissions(filter?: {
  status?: SubmissionStatus | SubmissionStatus[];
  author?: string;
  kind?: SubmissionKind;
}): Promise<Submission[]> {
  const kinds: SubmissionKind[] = filter?.kind ? [filter.kind] : ["article", "event"];
  const statuses = filter?.status
    ? Array.isArray(filter.status)
      ? filter.status
      : [filter.status]
    : null;
  const all = (await Promise.all(kinds.map(readAll))).flat();
  return all
    .filter((s) => (!statuses || statuses.includes(s.status)) && (!filter?.author || s.author === filter.author))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSubmission(id: string): Promise<Submission> {
  const kind = kindOfId(id);
  const found = (await readAll(kind)).find((s) => s.id === id);
  if (!found) throw new AppError("not_found", "Saisie introuvable.");
  return found;
}

export async function createSubmission(
  author: string,
  kind: SubmissionKind,
  input: unknown,
  now = new Date().toISOString(),
): Promise<Submission> {
  const fields = parseFields(kind, input);
  if (kind === "article") {
    const img = (fields as ArticleFields).image;
    if (img && !(await imageExists(img))) {
      throw new AppError("validation_failed", "Image inconnue.", {
        fields: { image: "Image : fichier introuvable, renvoyez-le." },
      });
    }
  }
  const id = PREFIX[kind] + randomBytes(8).toString("hex");
  const sub = {
    id,
    kind,
    author,
    createdAt: now,
    status: "submitted",
    original: fields,
    history: [{ at: now, action: "submitted", by: author }],
  } as Submission;
  await updateJson<Submission[]>(file(kind), [], (list) => [...list, sub]);
  return sub;
}

async function mutate(id: string, fn: (s: Submission) => Submission): Promise<Submission> {
  const kind = kindOfId(id);
  let result: Submission | undefined;
  await updateJson<Submission[]>(file(kind), [], (list) => {
    const i = list.findIndex((s) => s.id === id);
    if (i < 0) throw new AppError("not_found", "Saisie introuvable.");
    result = fn(list[i]);
    const next = [...list];
    next[i] = result;
    return next;
  });
  return result!;
}

export const submitReview = (id: string, review: ReviewInput, now = new Date().toISOString()) =>
  mutate(id, (s) => applyReview(s, review, now));

export const publishSubmission = (
  id: string,
  version: PublishedVersion,
  now = new Date().toISOString(),
) => mutate(id, (s) => applyPublish(s, version, now));

export const rejectSubmission = (id: string, reason: string, now = new Date().toISOString()) =>
  mutate(id, (s) => applyReject(s, reason, now));

/** Date du jour à Paris, AAAA-MM-JJ. */
export function todayParis(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(now);
}

/** Actualités publiées, plus récentes d'abord ; les dates futures sont masquées. */
export async function getPublishedArticles(
  limit?: number,
  now = new Date(),
): Promise<PublishedArticle[]> {
  const today = todayParis(now);
  const items = (await readAll("article") as ArticleSubmission[])
    .filter((s) => s.status === "published" && s.published && s.published.fields.publishedAt <= today)
    .map((s) => ({
      id: s.id,
      author: s.author,
      publishedAt: s.published!.fields.publishedAt,
      fields: s.published!.fields,
      moderatedAt: s.published!.publishedAt,
    }))
    .sort(
      (a, b) =>
        b.publishedAt.localeCompare(a.publishedAt) || b.moderatedAt.localeCompare(a.moderatedAt),
    )
    .map((x) => ({ id: x.id, author: x.author, publishedAt: x.publishedAt, fields: x.fields }));
  return limit && limit > 0 ? items.slice(0, limit) : items;
}

/** Rendez-vous publiés dont la date est >= `from` (AAAA-MM-JJ), par ordre chronologique. */
export async function getUpcomingEvents(from: string = todayParis()): Promise<PublishedEvent[]> {
  return ((await readAll("event")) as EventSubmission[])
    .filter((s) => s.status === "published" && s.published && s.published.fields.date >= from)
    .map((s) => ({ id: s.id, author: s.author, fields: s.published!.fields as EventFields }))
    .sort(
      (a, b) =>
        a.fields.date.localeCompare(b.fields.date) ||
        (a.fields.startTime ?? "").localeCompare(b.fields.startTime ?? ""),
    );
}
