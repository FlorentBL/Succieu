#!/usr/bin/env node
// CLI de l'agent relecteur : show, submit-review, notify.
// Env : SUCCIEU_BASE_URL, REVIEW_API_TOKEN, DISCORD_WEBHOOK_URL (notify).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ID_RE = /^[ae]-[0-9a-f]{16}$/;
const KIND_LABEL = { article: "Actualité", event: "Rendez-vous" };
export const LIMITS = { content: 2000, title: 256, description: 4096, fieldValue: 1024 };

export function truncate(text, max) {
  const s = String(text ?? "");
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

/** Valide l'avis ; retourne la liste des erreurs (vide = valide). */
export function validateReview(r) {
  const errs = [];
  if (!r || typeof r !== "object" || Array.isArray(r)) return ["l'avis doit être un objet JSON"];
  if (typeof r.ok !== "boolean") errs.push("`ok` doit être un booléen");
  if (!Array.isArray(r.issues) || r.issues.some((i) => typeof i !== "string" || !i.trim())) {
    errs.push("`issues` doit être un tableau de textes non vides");
  }
  if (typeof r.summary !== "string" || !r.summary.trim()) errs.push("`summary` doit être un texte non vide");
  else if (r.summary.length > 1000) errs.push("`summary` dépasse 1000 caractères");
  if (!r.corrected || typeof r.corrected !== "object" || Array.isArray(r.corrected)) {
    errs.push("`corrected` doit être un objet (mêmes champs que la saisie originale)");
  } else if (typeof r.corrected.title !== "string" || !r.corrected.title.trim()) {
    errs.push("`corrected.title` est obligatoire");
  }
  return errs;
}

async function api(env, fetchFn, method, route, body) {
  const base = (env.SUCCIEU_BASE_URL || "").replace(/\/+$/, "");
  if (!base || !env.REVIEW_API_TOKEN) throw new Error("Variables manquantes : SUCCIEU_BASE_URL, REVIEW_API_TOKEN.");
  const res = await fetchFn(`${base}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.REVIEW_API_TOKEN}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  let data = null;
  try { data = await res.json(); } catch { /* corps non JSON */ }
  if (!res.ok) {
    const err = data?.error;
    const fields = err?.fields ? ` ${JSON.stringify(err.fields)}` : "";
    throw new Error(`HTTP ${res.status} ${err?.code ?? ""} ${err?.message ?? ""}${fields}`.trim());
  }
  return data;
}

function checkId(id) {
  if (!ID_RE.test(id || "")) throw new Error("Identifiant invalide (attendu a-… ou e-… suivi de 16 caractères hexadécimaux).");
}

export async function show(id, { env = process.env, fetchFn = fetch } = {}) {
  checkId(id);
  const { submission } = await api(env, fetchFn, "GET", `/api/review/submissions/${id}`);
  return submission;
}

export async function submitReview(id, file, { env = process.env, fetchFn = fetch, readFileFn = readFile } = {}) {
  checkId(id);
  let review;
  try {
    review = JSON.parse(await readFileFn(file, "utf8"));
  } catch (e) {
    throw new Error(`Fichier d'avis illisible (${file}) : ${e.message}`);
  }
  const errs = validateReview(review);
  if (errs.length) throw new Error(`Avis invalide :\n- ${errs.join("\n- ")}`);
  const { ok, issues, corrected, summary } = review;
  await api(env, fetchFn, "POST", `/api/review/submissions/${id}`, { ok, issues, corrected, summary });
  return "Avis déposé (statut : reviewed).";
}

/** Construit la charge utile Discord (sans mention possible). */
export function buildDiscordPayload(sub, baseUrl) {
  const link = `${baseUrl.replace(/\/+$/, "")}/espace-bureau/moderation/${sub.id}`;
  const label = KIND_LABEL[sub.kind] ?? sub.kind;
  const title = sub.review?.corrected?.title || sub.original?.title || sub.id;
  const review = sub.review;
  const points = review
    ? [
        review.ok ? "✅ Avis : conforme" : "⚠️ Avis : à corriger",
        ...(review.issues ?? []).slice(0, 2).map((i) => `• ${truncate(i, 300)}`),
      ]
    : ["Avis non disponible."];
  if (review?.summary) points.splice(1, 0, truncate(review.summary, 300));
  const lines = [`**${label}** de ${truncate(sub.author, 100)} : ${truncate(title, 150)}`, ...points.slice(0, 4), link];
  return {
    username: "Relecture Succieu",
    content: truncate(lines.join("\n"), LIMITS.content),
    allowed_mentions: { parse: [] },
  };
}

export async function notify(id, { env = process.env, fetchFn = fetch } = {}) {
  checkId(id);
  const hook = env.DISCORD_WEBHOOK_URL;
  if (!hook) throw new Error("DISCORD_WEBHOOK_URL manquante.");
  const sub = await show(id, { env, fetchFn });
  const payload = buildDiscordPayload(sub, env.SUCCIEU_BASE_URL);
  const res = await fetchFn(hook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Discord a répondu HTTP ${res.status}.`);
  return "Alerte Discord envoyée.";
}

const USAGE = "Usage : cli.mjs show <id> | submit-review <id> <fichier.json> | notify <id>";

export async function main(argv, deps = {}) {
  const [cmd, id, file] = argv;
  if (cmd === "show") return JSON.stringify(await show(id, deps), null, 2);
  if (cmd === "submit-review" && file) return submitReview(id, file, deps);
  if (cmd === "notify") return notify(id, deps);
  throw new Error(USAGE);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    console.log(await main(process.argv.slice(2)));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
