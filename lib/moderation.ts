import type { ContentFields, Submission, SubmissionKind } from "@/lib/content/types";

/** Appel d'une route de l'API (cookies de session, JSON) ; lève une Error au message lisible. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Connexion impossible : vérifiez le réseau et réessayez.", 0);
  }
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: { code: string; message: string } })
    | null;
  if (!res.ok) {
    throw new ApiError(
      data?.error?.message ?? "Erreur inattendue, réessayez.",
      res.status,
      data?.error?.code,
    );
  }
  return data as T;
}

export const KIND_LABEL: Record<SubmissionKind, string> = {
  article: "Actualité",
  event: "Agenda",
};

export const STATUS_LABEL: Record<Submission["status"], string> = {
  submitted: "En attente de relecture",
  reviewed: "Relue par l'agent",
  published: "Publiée",
  rejected: "Refusée",
};

export const ACTION_LABEL: Record<string, string> = {
  submitted: "Saisie déposée",
  reviewed: "Relecture par l'agent",
  published: "Publiée",
  rejected: "Refusée",
};

export const FIELD_LABELS: Record<string, string> = {
  title: "Titre",
  summary: "Chapeau",
  body: "Texte complet",
  linkUrl: "Lien",
  linkLabel: "Libellé du lien",
  image: "Image",
  publishedAt: "Date de publication",
  date: "Date",
  startTime: "Début",
  endTime: "Fin",
  place: "Lieu",
  description: "Description",
};

export const FIELD_ORDER: Record<SubmissionKind, string[]> = {
  article: ["title", "summary", "body", "linkUrl", "linkLabel", "image", "publishedAt"],
  event: ["title", "date", "startTime", "endTime", "place", "description", "linkUrl"],
};

export function fieldValue(fields: ContentFields, key: string): string {
  const v = (fields as Record<string, unknown>)[key];
  return typeof v === "string" ? v : "";
}

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** AAAA-MM-JJ -> « samedi 5 décembre 2026 ». */
export function formatDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? day : dateOnly.format(d);
}

export type DiffPart = { text: string; kind: "same" | "add" | "del" };

/** Différence mot à mot (plus longue sous-suite commune). */
export function wordDiff(a: string, b: string): { before: DiffPart[]; after: DiffPart[] } {
  const ta = a.split(/(\s+)/).filter((t) => t !== "");
  const tb = b.split(/(\s+)/).filter((t) => t !== "");
  const n = ta.length;
  const m = tb.length;
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const before: DiffPart[] = [];
  const after: DiffPart[] = [];
  const push = (list: DiffPart[], text: string, kind: DiffPart["kind"]) => {
    const last = list[list.length - 1];
    if (last && last.kind === kind) last.text += text;
    else list.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (ta[i] === tb[j]) {
      push(before, ta[i], "same");
      push(after, tb[j], "same");
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push(before, ta[i++], "del");
    } else {
      push(after, tb[j++], "add");
    }
  }
  while (i < n) push(before, ta[i++], "del");
  while (j < m) push(after, tb[j++], "add");
  return { before, after };
}
