import { AppError } from "./errors";
import type { ReviewInput } from "./validation";
import type {
  ContentFields,
  Published,
  PublishedVersion,
  Review,
  Submission,
} from "./types";

/**
 * Machine d'états (fonctions pures, sans entrée/sortie) :
 *   submitted -> reviewed (agent)
 *   submitted | reviewed -> published | rejected (admin)
 * "published" et "rejected" sont terminaux.
 */

function bad(sub: Submission, action: string): never {
  throw new AppError(
    "invalid_transition",
    `Action « ${action} » impossible depuis le statut « ${sub.status} ».`,
  );
}

export function applyReview(sub: Submission, input: ReviewInput, now: string): Submission {
  if (sub.status !== "submitted") bad(sub, "reviewed");
  const review: Review = { ...input, reviewedAt: now };
  return {
    ...sub,
    status: "reviewed",
    review,
    history: [
      ...sub.history,
      { at: now, action: "reviewed", by: "agent", note: input.summary },
    ],
  } as Submission;
}

export function applyPublish(
  sub: Submission,
  version: PublishedVersion,
  now: string,
  by = "admin",
): Submission {
  if (sub.status !== "submitted" && sub.status !== "reviewed") bad(sub, "published");
  if (version !== "original" && version !== "corrected") {
    throw new AppError("validation_failed", "Version à publier invalide.", {
      fields: { version: '"original" ou "corrected" attendu.' },
    });
  }
  let fields: ContentFields;
  if (version === "corrected") {
    if (!sub.review) {
      throw new AppError(
        "invalid_transition",
        "Aucune version corrigée : la saisie n'a pas été relue.",
      );
    }
    fields = sub.review.corrected;
  } else {
    fields = sub.original;
  }
  const published: Published = { version, fields, publishedAt: now };
  return {
    ...sub,
    status: "published",
    published,
    history: [...sub.history, { at: now, action: "published", by, note: `version ${version}` }],
  } as Submission;
}

export function applyReject(
  sub: Submission,
  reason: string,
  now: string,
  by = "admin",
): Submission {
  if (sub.status !== "submitted" && sub.status !== "reviewed") bad(sub, "rejected");
  return {
    ...sub,
    status: "rejected",
    rejectionReason: reason,
    history: [...sub.history, { at: now, action: "rejected", by, note: reason }],
  } as Submission;
}
