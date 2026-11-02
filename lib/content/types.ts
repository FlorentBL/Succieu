export type SubmissionKind = "article" | "event";
export type SubmissionStatus = "submitted" | "reviewed" | "published" | "rejected";
export type PublishedVersion = "original" | "corrected";

/** Champs saisis pour une actualité (carrousel d'accueil). */
export type ArticleFields = {
  title: string;
  /** Chapeau / texte court du carrousel. */
  summary: string;
  body: string;
  linkUrl?: string;
  linkLabel?: string;
  /** Nom de fichier retourné par POST /api/bureau/uploads. */
  image?: string;
  /** Date de publication affichée, AAAA-MM-JJ. */
  publishedAt: string;
};

/** Champs saisis pour un rendez-vous (agenda). */
export type EventFields = {
  title: string;
  /** AAAA-MM-JJ */
  date: string;
  /** HH:MM */
  startTime?: string;
  endTime?: string;
  place: string;
  description: string;
  linkUrl?: string;
};

export type ContentFields = ArticleFields | EventFields;

export type HistoryAction =
  | "submitted"
  | "reviewed"
  | "published"
  | "rejected";

export type HistoryEntry = {
  at: string;
  action: HistoryAction;
  /** Nom du bureau, "admin" ou "agent". */
  by: string;
  note?: string;
};

export type Review<F extends ContentFields = ContentFields> = {
  ok: boolean;
  issues: string[];
  corrected: F;
  summary: string;
  reviewedAt: string;
};

export type Published<F extends ContentFields = ContentFields> = {
  version: PublishedVersion;
  fields: F;
  publishedAt: string;
};

type SubmissionBase<K extends SubmissionKind, F extends ContentFields> = {
  id: string;
  kind: K;
  author: string;
  createdAt: string;
  status: SubmissionStatus;
  original: F;
  review?: Review<F>;
  published?: Published<F>;
  rejectionReason?: string;
  history: HistoryEntry[];
};

export type ArticleSubmission = SubmissionBase<"article", ArticleFields>;
export type EventSubmission = SubmissionBase<"event", EventFields>;
export type Submission = ArticleSubmission | EventSubmission;

export type PublishedArticle = {
  id: string;
  author: string;
  publishedAt: string;
  fields: ArticleFields;
};
export type PublishedEvent = {
  id: string;
  author: string;
  fields: EventFields;
};
