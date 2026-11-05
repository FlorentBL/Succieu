#!/usr/bin/env node
// CLI de l'agent relecteur : show, submit-review, notify, test-mail.
// Env : REVIEW_API_TOKEN, SUCCIEU_BASE_URL (défaut https://succieu.fr),
//   notify, canal Discord : DISCORD_WEBHOOK_ALERTES_MAIRIE (DISCORD_WEBHOOK_URL accepté en repli) ;
//   notify, canal mail (optionnel, SMTP sans dépendance) : SMTP_USER, SMTP_PASSWORD, MAIL_MODERATION_TO (adresses séparées par des virgules),
//   MAIL_FROM (défaut SMTP_USER), SMTP_HOST (défaut ssl0.ovh.net), SMTP_PORT (défaut 465, TLS implicite).
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import tls from "node:tls";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ID_RE = /^[ae]-[0-9a-f]{16}$/;
const KIND_LABEL = { article: "Actualité", event: "Agenda" };
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
  const base = (env.SUCCIEU_BASE_URL || "https://succieu.fr").replace(/\/+$/, "");
  if (!env.REVIEW_API_TOKEN) throw new Error("Variable manquante : REVIEW_API_TOKEN (secret injecté).");
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

const MAIL_FROM_NAME = "Relecture Succieu";
const SMTP_TIMEOUT_MS = 20_000;
const ADDR_RE = /^[^\s<>"(),;:\\\r\n@]+@[^\s<>"(),;:\\\r\n@]+\.[^\s<>"(),;:\\\r\n@]+$/;

/** Construit le mail de modération (pure) : { subject, text }. */
export function buildMail(sub, baseUrl) {
  const link = `${baseUrl.replace(/\/+$/, "")}/espace-bureau/moderation/${sub.id}`;
  const label = KIND_LABEL[sub.kind] ?? sub.kind;
  const title = sub.review?.corrected?.title || sub.original?.title || sub.id;
  const review = sub.review;
  const oneLine = (t, max) => truncate(String(t ?? "").replace(/\s+/g, " ").trim(), max);
  const lines = [
    "Bonjour,",
    "",
    "Une nouvelle saisie du bureau attend votre relecture.",
    "",
    `Type : ${label}`,
    `Auteur : ${oneLine(sub.author, 100)}`,
    `Titre : ${oneLine(title, 150)}`,
    "",
  ];
  if (review) {
    lines.push(review.ok ? "Avis de l'agent : conforme" : "Avis de l'agent : à corriger");
    if (review.summary) lines.push(oneLine(review.summary, 500));
    const issues = (review.issues ?? []).slice(0, 3);
    if (issues.length) lines.push("", ...issues.map((i) => `- ${oneLine(i, 300)}`));
  } else {
    lines.push("Avis de l'agent : non disponible.");
  }
  lines.push("", "Pour relire, corriger et décider :", link, "", "Ce message est envoyé automatiquement, ne pas y répondre.");
  return { subject: `[Succieu] Nouvelle saisie à modérer : ${oneLine(title, 150)}`, text: lines.join("\n") };
}

const b64 = (buf) => Buffer.from(buf).toString("base64");

/** Encode un en-tête non ASCII en mots encodés RFC 2047 (UTF-8, base64, ≤ 75 caractères). */
export function encodeHeader(value) {
  const v = String(value).replace(/[\r\n]+/g, " ");
  if (/^[\x20-\x7e]*$/.test(v)) return v;
  const words = [];
  let cur = "";
  for (const ch of v) {
    if (Buffer.byteLength(cur + ch) > 45) { words.push(cur); cur = ""; }
    cur += ch;
  }
  if (cur) words.push(cur);
  return words.map((w) => `=?UTF-8?B?${b64(w)}?=`).join("\r\n ");
}

/** Bourrage des points initiaux (RFC 5321 §4.5.2) ; les fins de ligne sont normalisées en CRLF. */
export function dotStuff(text) {
  return String(text).replace(/\r\n|\r|\n/g, "\r\n").replace(/^\./gm, "..");
}

/** Message SMTP complet (en-têtes + corps base64), sans point final de DATA. */
export function formatMessage({ from, fromName = MAIL_FROM_NAME, to, subject, text, date = new Date(), messageId }) {
  const domain = from.split("@")[1];
  const id = messageId ?? `<${randomBytes(12).toString("hex")}@${domain}>`;
  const body = (b64(text).match(/.{1,76}/g) ?? []).join("\r\n");
  const headers = [
    `Date: ${date.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: ${id}`,
    `From: ${/^[\x20-\x7e]*$/.test(fromName) ? `"${fromName}"` : encodeHeader(fromName)} <${from}>`,
    `To: ${to.join(", ")}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
  ];
  return dotStuff(`${headers.join("\r\n")}\r\n\r\n${body}`);
}

/** Liste d'adresses séparées par des virgules ; ignore les entrées vides, refuse les adresses douteuses. */
export function parseRecipients(raw) {
  const list = String(raw ?? "").split(",").map((a) => a.trim()).filter(Boolean);
  if (list.some((a) => !ADDR_RE.test(a))) throw new Error("MAIL_MODERATION_TO contient une adresse invalide.");
  return [...new Set(list)];
}

function mailConfig(env) {
  if (!env.SMTP_USER || !String(env.MAIL_MODERATION_TO ?? "").trim()) return null;
  return { user: env.SMTP_USER, to: parseRecipients(env.MAIL_MODERATION_TO), env };
}

/**
 * Client SMTP minimal, TLS implicite. connectFn(host, port) retourne un socket (injectable pour les tests).
 * Ne journalise ni le mot de passe ni les adresses.
 */
export async function sendSmtp({ host, port, user, password, from, to, message, connectFn, timeoutMs = SMTP_TIMEOUT_MS }) {
  if (!password) throw new Error("SMTP_PASSWORD manquante (secret injecté).");
  if (!ADDR_RE.test(from)) throw new Error("Adresse d'expéditeur invalide (MAIL_FROM / SMTP_USER).");
  const connect = connectFn ?? ((h, p) => tls.connect({ host: h, port: p, servername: h }));
  const socket = connect(host, port);
  let buffer = "";
  let ended = null;
  let wake = null;
  const fail = (e) => { ended ??= e; wake?.(); };
  const timer = setTimeout(() => { fail(new Error(`SMTP : délai dépassé (${timeoutMs / 1000} s) — vérifier le port et le pare-feu.`)); socket.destroy(); }, timeoutMs);
  socket.setEncoding("utf8");
  socket.on("data", (d) => { buffer += d; wake?.(); });
  socket.on("error", (e) => fail(new Error(`SMTP : connexion impossible (${e.code ?? e.message}).`)));
  socket.on("close", () => fail(new Error("SMTP : connexion fermée par le serveur.")));

  const readReply = async () => {
    for (;;) {
      const rows = buffer.split("\n");
      const last = rows.findIndex((r, i) => i < rows.length - 1 && /^\d{3}(?: |\r?$)/.test(r));
      if (last >= 0) {
        const lines = rows.slice(0, last + 1).map((r) => r.replace(/\r$/, ""));
        buffer = rows.slice(last + 1).join("\n");
        return { code: Number(lines[last].slice(0, 3)), lines: lines.map((l) => l.slice(4)) };
      }
      if (ended) throw ended;
      await new Promise((r) => { wake = r; });
      wake = null;
    }
  };
  const expect = async (step, codes) => {
    const r = await readReply();
    if (!codes.includes(r.code)) {
      const detail = step === "RCPT TO" ? "" : ` ${r.lines.join(" ")}`.trimEnd();
      throw new Error(`SMTP : échec à l'étape ${step} (code ${r.code})${detail ? ` :${detail}` : ""}.`);
    }
    return r;
  };
  const send = async (line, step, codes) => {
    if (ended) throw ended;
    socket.write(`${line}\r\n`);
    return expect(step, codes);
  };

  try {
    await expect("connexion", [220]);
    const ehlo = await send(`EHLO ${from.split("@")[1]}`, "EHLO", [250]);
    const auth = ehlo.lines.find((l) => /^AUTH[ =]/i.test(l)) ?? "";
    if (/\bPLAIN\b/i.test(auth) || !/\bLOGIN\b/i.test(auth)) {
      await send(`AUTH PLAIN ${b64(`\0${user}\0${password}`)}`, "AUTH", [235]);
    } else {
      await send("AUTH LOGIN", "AUTH", [334]);
      await send(b64(user), "AUTH", [334]);
      await send(b64(password), "AUTH", [235]);
    }
    await send(`MAIL FROM:<${from}>`, "MAIL FROM", [250]);
    for (const addr of to) await send(`RCPT TO:<${addr}>`, "RCPT TO", [250, 251]);
    await send("DATA", "DATA", [354]);
    socket.write(`${message}\r\n.\r\n`);
    await expect("envoi du message", [250]);
    socket.end("QUIT\r\n");
  } finally {
    clearTimeout(timer);
    setTimeout(() => socket.destroy(), 500).unref();
  }
}

async function sendMailChannel(cfg, { subject, text }, deps) {
  const env = cfg.env;
  const from = env.MAIL_FROM || cfg.user;
  const message = formatMessage({ from, to: cfg.to, subject, text });
  await (deps.smtpFn ?? sendSmtp)({
    host: env.SMTP_HOST || "ssl0.ovh.net",
    port: Number(env.SMTP_PORT) || 465,
    user: cfg.user,
    password: env.SMTP_PASSWORD,
    from,
    to: cfg.to,
    message,
    connectFn: deps.connectFn,
  });
  return `Mail envoyé (${cfg.to.length} destinataire${cfg.to.length > 1 ? "s" : ""}).`;
}

export async function notify(id, { env = process.env, fetchFn = fetch, ...deps } = {}) {
  checkId(id);
  const hook = env.DISCORD_WEBHOOK_ALERTES_MAIRIE || env.DISCORD_WEBHOOK_URL;
  // Une configuration mail invalide est un échec du seul canal mail : Discord part quand même.
  let mail = null;
  let mailError = null;
  try { mail = mailConfig(env); } catch (e) { mailError = e; }
  if (!hook && !mail && !mailError) {
    throw new Error("Aucun canal d'alerte configuré : DISCORD_WEBHOOK_ALERTES_MAIRIE manquante (et mail non configuré : SMTP_USER, SMTP_PASSWORD, MAIL_MODERATION_TO).");
  }
  const sub = await show(id, { env, fetchFn });
  const baseUrl = env.SUCCIEU_BASE_URL || "https://succieu.fr";
  const channels = [];
  if (hook) {
    channels.push(["Discord", async () => {
      const res = await fetchFn(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildDiscordPayload(sub, baseUrl)),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`Discord a répondu HTTP ${res.status}.`);
      return "Alerte Discord envoyée.";
    }]);
  }
  if (mail) channels.push(["mail", () => sendMailChannel(mail, buildMail(sub, baseUrl), { ...deps, env })]);
  else if (mailError) channels.push(["mail", async () => { throw mailError; }]);
  return runChannels(channels);
}

async function runChannels(channels) {
  const ok = [];
  const ko = [];
  for (const [name, run] of channels) {
    try { ok.push(await run()); } catch (e) { ko.push(`${name} (${e.message})`); }
  }
  if (ko.length) {
    throw new Error(`Échec du canal ${ko.join(" ; ")}. ${ok.length ? `Canal réussi : ${ok.join(" ")}` : "Aucun canal n'a abouti."}`.trim());
  }
  return ok.join(" ");
}

export async function testMail({ env = process.env, ...deps } = {}) {
  const cfg = mailConfig(env);
  if (!cfg) throw new Error("Mail non configuré : SMTP_USER, SMTP_PASSWORD et MAIL_MODERATION_TO sont nécessaires.");
  return sendMailChannel(cfg, {
    subject: "[Succieu] Mail d'essai de la relecture",
    text: "Bonjour,\n\nCeci est un mail d'essai : la boîte d'envoi des alertes de modération Succieu fonctionne.\n\nCe message est envoyé automatiquement, ne pas y répondre.",
  }, { ...deps, env });
}

const USAGE = "Usage : cli.mjs show <id> | submit-review <id> <fichier.json> | notify <id> | test-mail";

export async function main(argv, deps = {}) {
  const [cmd, id, file] = argv;
  if (cmd === "show") return JSON.stringify(await show(id, deps), null, 2);
  if (cmd === "submit-review" && file) return submitReview(id, file, deps);
  if (cmd === "notify") return notify(id, deps);
  if (cmd === "test-mail") return testMail(deps);
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
