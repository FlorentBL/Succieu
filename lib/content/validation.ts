import { AppError } from "./errors";
import type {
  ArticleFields,
  ContentFields,
  EventFields,
  Review,
  SubmissionKind,
} from "./types";

export const LIMITS = {
  title: 90,
  summary: 280,
  body: 5000,
  place: 120,
  description: 2000,
  linkUrl: 500,
  linkLabel: 60,
  issues: 20,
  issue: 500,
  reviewSummary: 1000,
  reason: 500,
  note: 500,
} as const;

type Errors = Record<string, string>;

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function clean(v: unknown): string {
  return typeof v === "string" ? v.replace(CONTROL, "").trim() : "";
}

function text(
  src: Record<string, unknown>,
  key: string,
  max: number,
  errors: Errors,
  required: boolean,
  label: string,
): string | undefined {
  const raw = src[key];
  if (raw !== undefined && raw !== null && typeof raw !== "string") {
    errors[key] = `${label} : texte attendu.`;
    return undefined;
  }
  const v = clean(raw);
  if (!v) {
    if (required) errors[key] = `${label} : champ obligatoire.`;
    return undefined;
  }
  if (v.length > max) {
    errors[key] = `${label} : ${max} caractères maximum (${v.length} saisis).`;
    return undefined;
  }
  return v;
}

export function isValidDate(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isValidTime(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Lien http(s) ou chemin relatif du site. */
export function isValidLink(v: string): boolean {
  if (/^\/(?!\/)[^\s]*$/.test(v)) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const IMAGE_NAME_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

function link(src: Record<string, unknown>, errors: Errors): string | undefined {
  const v = text(src, "linkUrl", LIMITS.linkUrl, errors, false, "Lien");
  if (v && !isValidLink(v)) {
    errors.linkUrl = "Lien : adresse http(s) ou chemin du site attendu.";
    return undefined;
  }
  return v;
}

function date(
  src: Record<string, unknown>,
  key: string,
  errors: Errors,
  label: string,
): string | undefined {
  const v = text(src, key, 10, errors, true, label);
  if (v && !isValidDate(v)) {
    errors[key] = `${label} : date AAAA-MM-JJ valide attendue.`;
    return undefined;
  }
  return v;
}

function time(
  src: Record<string, unknown>,
  key: string,
  errors: Errors,
  label: string,
): string | undefined {
  const v = text(src, key, 5, errors, false, label);
  if (v && !isValidTime(v)) {
    errors[key] = `${label} : heure HH:MM attendue.`;
    return undefined;
  }
  return v;
}

function asObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("validation_failed", "Objet attendu.");
  }
  return input as Record<string, unknown>;
}

function fail(errors: Errors): never {
  throw new AppError("validation_failed", "Certains champs sont invalides.", {
    fields: errors,
  });
}

/** Champs inconnus ignorés ; champs facultatifs vides omis. */
export function parseArticleFields(input: unknown): ArticleFields {
  const src = asObject(input);
  const errors: Errors = {};
  const title = text(src, "title", LIMITS.title, errors, true, "Titre");
  const summary = text(src, "summary", LIMITS.summary, errors, true, "Chapeau");
  const body = text(src, "body", LIMITS.body, errors, true, "Texte complet");
  const linkUrl = link(src, errors);
  const linkLabel = text(src, "linkLabel", LIMITS.linkLabel, errors, false, "Libellé du lien");
  if (linkLabel && !linkUrl && !errors.linkUrl) {
    errors.linkLabel = "Libellé du lien : un lien est nécessaire.";
  }
  const image = text(src, "image", 64, errors, false, "Image");
  if (image && !IMAGE_NAME_RE.test(image)) errors.image = "Image : identifiant invalide.";
  const publishedAt = date(src, "publishedAt", errors, "Date de publication");
  if (Object.keys(errors).length) fail(errors);
  const out: ArticleFields = {
    title: title!,
    summary: summary!,
    body: body!,
    publishedAt: publishedAt!,
  };
  if (linkUrl) out.linkUrl = linkUrl;
  if (linkLabel) out.linkLabel = linkLabel;
  if (image) out.image = image;
  return out;
}

export function parseEventFields(input: unknown): EventFields {
  const src = asObject(input);
  const errors: Errors = {};
  const title = text(src, "title", LIMITS.title, errors, true, "Titre");
  const d = date(src, "date", errors, "Date");
  const startTime = time(src, "startTime", errors, "Heure de début");
  const endTime = time(src, "endTime", errors, "Heure de fin");
  if (endTime && !startTime && !errors.endTime) {
    errors.endTime = "Heure de fin : indiquez aussi l'heure de début.";
  }
  if (startTime && endTime && endTime < startTime) {
    errors.endTime = "Heure de fin : doit être postérieure au début.";
  }
  const place = text(src, "place", LIMITS.place, errors, true, "Lieu");
  const description = text(src, "description", LIMITS.description, errors, true, "Description");
  const linkUrl = link(src, errors);
  if (Object.keys(errors).length) fail(errors);
  const out: EventFields = {
    title: title!,
    date: d!,
    place: place!,
    description: description!,
  };
  if (startTime) out.startTime = startTime;
  if (endTime) out.endTime = endTime;
  if (linkUrl) out.linkUrl = linkUrl;
  return out;
}

export function parseFields(kind: SubmissionKind, input: unknown): ContentFields {
  return kind === "article" ? parseArticleFields(input) : parseEventFields(input);
}

export function parseKind(v: unknown): SubmissionKind {
  if (v === "article" || v === "event") return v;
  throw new AppError("validation_failed", "Type de saisie invalide.", {
    fields: { kind: 'Type : "article" ou "event" attendu.' },
  });
}

export type ReviewInput = Omit<Review, "reviewedAt">;

/**
 * Valide l’avis du relecteur. `imageExists` est fourni par l’appelant côté serveur
 * (lib/content/images) : ce module reste importable côté client, sans accès disque.
 */
export async function parseReview(
  kind: SubmissionKind,
  input: unknown,
  imageExists?: (name: string) => Promise<boolean>,
): Promise<ReviewInput> {
  const src = asObject(input);
  const errors: Errors = {};
  if (typeof src.ok !== "boolean") errors.ok = "ok : booléen attendu.";
  let issues: string[] = [];
  if (src.issues !== undefined) {
    if (!Array.isArray(src.issues) || src.issues.length > LIMITS.issues) {
      errors.issues = `issues : liste de ${LIMITS.issues} éléments maximum.`;
    } else {
      issues = src.issues.map(clean).filter(Boolean);
      if (issues.some((i) => i.length > LIMITS.issue)) {
        errors.issues = `issues : ${LIMITS.issue} caractères maximum par remarque.`;
      }
    }
  }
  const summary = text(src, "summary", LIMITS.reviewSummary, errors, true, "Résumé");
  let corrected: ContentFields | undefined;
  try {
    corrected = parseFields(kind, src.corrected);
  } catch (e) {
    if (e instanceof AppError && e.fields) {
      for (const [k, v] of Object.entries(e.fields)) errors[`corrected.${k}`] = v;
    } else errors.corrected = "corrected : objet attendu.";
  }
  if (kind === "article" && corrected) {
    const img = (corrected as ArticleFields).image;
    if (img && imageExists && !(await imageExists(img))) {
      errors["corrected.image"] = "Image : fichier introuvable, renvoyez-le.";
    }
  }
  if (Object.keys(errors).length) fail(errors);
  return { ok: src.ok as boolean, issues, summary: summary!, corrected: corrected! };
}

export function parseReason(v: unknown): string {
  const errors: Errors = {};
  const r = text({ reason: v }, "reason", LIMITS.reason, errors, true, "Motif");
  if (Object.keys(errors).length) fail(errors);
  return r!;
}
