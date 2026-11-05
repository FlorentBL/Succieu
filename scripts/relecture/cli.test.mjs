import test from "node:test";
import assert from "node:assert/strict";
import { validateReview, buildDiscordPayload, truncate, submitReview, notify, show, main } from "./cli.mjs";

const ID = "a-0123456789abcdef";
const env = { SUCCIEU_BASE_URL: "https://x.test", REVIEW_API_TOKEN: "t".repeat(24), DISCORD_WEBHOOK_ALERTES_MAIRIE: "https://discord.test/hook" };
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
const good = { ok: false, issues: ["Faute"], corrected: { title: "T" }, summary: "Résumé" };

test("validateReview", () => {
  assert.deepEqual(validateReview(good), []);
  assert.ok(validateReview(null).length);
  assert.ok(validateReview({ ...good, ok: "oui" }).length);
  assert.ok(validateReview({ ...good, issues: [""] }).length);
  assert.ok(validateReview({ ...good, summary: " " }).length);
  assert.ok(validateReview({ ...good, corrected: {} }).length);
  assert.ok(validateReview({ ...good, corrected: [] }).length);
});

test("submit-review : validation avant envoi, aucun appel si invalide", async () => {
  let called = 0;
  const fetchFn = async () => { called++; return json({}); };
  await assert.rejects(submitReview(ID, "f.json", { env, fetchFn, readFileFn: async () => '{"ok":1}' }), /Avis invalide/);
  await assert.rejects(submitReview(ID, "f.json", { env, fetchFn, readFileFn: async () => "pas json" }), /illisible/);
  assert.equal(called, 0);
});

test("submit-review : POST avec Bearer et champs filtrés", async () => {
  let req;
  const fetchFn = async (url, opt) => { req = { url, opt }; return json({ submission: {} }); };
  await submitReview(ID, "f.json", { env, fetchFn, readFileFn: async () => JSON.stringify({ ...good, extra: 1 }) });
  assert.equal(req.url, `https://x.test/api/review/submissions/${ID}`);
  assert.equal(req.opt.method, "POST");
  assert.deepEqual(Object.keys(JSON.parse(req.opt.body)).sort(), ["corrected", "issues", "ok", "summary"]);
});

test("erreur API : message avec code et champs", async () => {
  const fetchFn = async () => json({ error: { code: "validation_failed", message: "x", fields: { "corrected.date": "passée" } } }, 422);
  await assert.rejects(submitReview(ID, "f", { env, fetchFn, readFileFn: async () => JSON.stringify(good) }), /422 validation_failed.*corrected\.date/);
});

test("identifiant invalide refusé", async () => {
  await assert.rejects(show("../x", { env, fetchFn: async () => json({}) }), /Identifiant invalide/);
});

test("truncate", () => {
  assert.equal(truncate("abc", 5), "abc");
  assert.equal(truncate("a".repeat(10), 5).length, 5);
  assert.ok(truncate("a".repeat(10), 5).endsWith("…"));
});

test("message Discord : contenu, lien, mentions désactivées, troncature", () => {
  const sub = { id: ID, kind: "article", author: "Jeanne", original: { title: "Orig" }, review: { ok: false, issues: ["a", "b", "c"], summary: "Bref", corrected: { title: "Titre" } } };
  const p = buildDiscordPayload(sub, "https://x.test/");
  assert.deepEqual(p.allowed_mentions, { parse: [] });
  assert.match(p.content, /Actualité.*Jeanne.*Titre/);
  assert.ok(p.content.includes(`https://x.test/espace-bureau/moderation/${ID}`));
  assert.ok(!p.content.includes("• c"));
  const big = buildDiscordPayload({ ...sub, author: "@everyone".repeat(500), review: { ok: true, issues: ["z".repeat(5000)], summary: "s".repeat(5000) } }, "https://x.test");
  assert.ok(big.content.length <= 2000);
});

test("notify : lit la saisie puis poste sur le webhook", async () => {
  const calls = [];
  const fetchFn = async (url) => {
    calls.push(url);
    return url === env.DISCORD_WEBHOOK_ALERTES_MAIRIE ? { ok: true, status: 204 } : json({ submission: { id: ID, kind: "event", author: "A", original: { title: "Fête" } } });
  };
  assert.match(await notify(ID, { env, fetchFn }), /envoyée/);
  assert.equal(calls.length, 2);
  await assert.rejects(notify(ID, { env: { ...env, DISCORD_WEBHOOK_ALERTES_MAIRIE: "" }, fetchFn }), /DISCORD_WEBHOOK_ALERTES_MAIRIE/);
  await assert.rejects(notify(ID, { env, fetchFn: async (u) => (u === env.DISCORD_WEBHOOK_ALERTES_MAIRIE ? { ok: false, status: 429 } : json({ submission: { id: ID, kind: "event", author: "A", original: {} } })) }), /429/);
});

test("main : usage", async () => {
  await assert.rejects(main([]), /Usage/);
});

// --- Mail ---
import net from "node:net";
import { buildMail, encodeHeader, dotStuff, formatMessage, parseRecipients, sendSmtp, testMail } from "./cli.mjs";

const subMail = { id: ID, kind: "event", author: "Jeanne", original: { title: "Fête d'été" }, review: { ok: false, issues: ["a", "b", "c", "d"], summary: "Bref", corrected: { title: "Fête d’été à l’école" } } };
const mailEnv = { ...env, SMTP_USER: "moderation@succieu.fr", SMTP_PASSWORD: "secret-pw", MAIL_MODERATION_TO: "a@x.fr, b@y.fr" };

/** Faux serveur SMTP local (TCP clair, via connectFn injecté). */
async function fakeSmtp({ authCode = "235 ok", rcptCode = "250 ok", silent = false } = {}) {
  const log = [];
  const server = net.createServer((sock) => {
    if (silent) return;
    let data = false;
    let acc = "";
    sock.write("220 fake ESMTP\r\n");
    sock.on("data", (d) => {
      acc += d;
      let i;
      while ((i = acc.indexOf("\r\n")) >= 0) {
        const line = acc.slice(0, i);
        acc = acc.slice(i + 2);
        log.push(line);
        if (data) { if (line === ".") { data = false; sock.write("250 queued\r\n"); } continue; }
        if (line.startsWith("EHLO")) sock.write("250-fake\r\n250-SIZE 100\r\n250 AUTH PLAIN LOGIN\r\n");
        else if (line.startsWith("AUTH")) sock.write(`${authCode}\r\n`);
        else if (line.startsWith("RCPT")) sock.write(`${rcptCode}\r\n`);
        else if (line === "DATA") { data = true; sock.write("354 go\r\n"); }
        else if (line === "QUIT") sock.end("221 bye\r\n");
        else sock.write("250 ok\r\n");
      }
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  return { log, port, connectFn: (_h, p) => net.connect(p, "127.0.0.1"), close: () => server.close() };
}

test("buildMail : sujet, corps, lien, 3 points maximum", () => {
  const m = buildMail(subMail, "https://x.test/");
  assert.equal(m.subject, "[Succieu] Nouvelle saisie à modérer : Fête d’été à l’école");
  assert.match(m.text, /Type : Agenda/);
  assert.match(m.text, /Auteur : Jeanne/);
  assert.match(m.text, /à corriger/);
  assert.ok(m.text.includes(`https://x.test/espace-bureau/moderation/${ID}`));
  assert.ok(m.text.includes("- c") && !m.text.includes("- d"));
  assert.match(m.text, /ne pas y répondre\.$/);
  const big = buildMail({ ...subMail, author: "x\ny".repeat(300), review: { ok: true, issues: [], summary: "s".repeat(5000), corrected: { title: "T\r\nBcc: z" } } }, "https://x.test");
  assert.ok(!/[\r\n]/.test(big.subject));
  assert.ok(big.text.length < 2000);
  assert.match(buildMail({ id: ID, kind: "article", author: "A", original: {} }, "https://x.test").text, /non disponible/);
});

test("encodeHeader : RFC 2047, mots ≤ 75 caractères", () => {
  assert.equal(encodeHeader("Simple"), "Simple");
  const h = encodeHeader("é".repeat(100));
  for (const w of h.split("\r\n ")) {
    assert.ok(w.length <= 75);
    assert.match(w, /^=\?UTF-8\?B\?[A-Za-z0-9+/=]+\?=$/);
  }
  const back = h.split("\r\n ").map((w) => Buffer.from(w.slice(10, -2), "base64").toString()).join("");
  assert.equal(back, "é".repeat(100));
});

test("dotStuff et formatMessage", () => {
  assert.equal(dotStuff("a\n.b\n..c"), "a\r\n..b\r\n...c");
  const msg = formatMessage({ from: "m@succieu.fr", to: ["a@x.fr", "b@y.fr"], subject: "Été", text: "Bonjour\n.\nfin", date: new Date("2026-11-05T10:00:00Z") });
  assert.match(msg, /^Date: Thu, 05 Nov 2026 10:00:00 \+0000\r\n/);
  assert.match(msg, /Message-ID: <[0-9a-f]+@succieu\.fr>/);
  assert.match(msg, /From: "Relecture Succieu" <m@succieu\.fr>/);
  assert.match(msg, /To: a@x\.fr, b@y\.fr/);
  assert.match(msg, /Subject: =\?UTF-8\?B\?/);
  assert.match(msg, /Content-Type: text\/plain; charset=utf-8/);
  assert.match(msg, /Content-Transfer-Encoding: base64/);
  const body = msg.split("\r\n\r\n")[1];
  assert.equal(Buffer.from(body.replace(/\r\n/g, ""), "base64").toString(), "Bonjour\n.\nfin");
  assert.ok(!/^\./m.test(body));
});

test("parseRecipients", () => {
  assert.deepEqual(parseRecipients(" a@x.fr,,b@y.fr , a@x.fr"), ["a@x.fr", "b@y.fr"]);
  assert.throws(() => parseRecipients("a@x.fr, pas une adresse"), /invalide/);
  assert.throws(() => parseRecipients("a@x.fr>\r\nBcc: z@z.fr"), /invalide/);
});

test("SMTP : dialogue complet contre un faux serveur", async () => {
  const srv = await fakeSmtp();
  try {
    const message = formatMessage({ from: "m@succieu.fr", to: ["a@x.fr", "b@y.fr"], subject: "S", text: "t" });
    await sendSmtp({ host: "h", port: srv.port, user: "m@succieu.fr", password: "pw", from: "m@succieu.fr", to: ["a@x.fr", "b@y.fr"], message, connectFn: srv.connectFn });
    await new Promise((r) => setTimeout(r, 100));
    const cmds = srv.log.filter((l) => /^(EHLO|AUTH|MAIL|RCPT|DATA|QUIT)/.test(l));
    assert.deepEqual(cmds.map((c) => c.split(" ")[0]), ["EHLO", "AUTH", "MAIL", "RCPT", "RCPT", "DATA", "QUIT"]);
    assert.equal(srv.log.find((l) => l.startsWith("AUTH")), `AUTH PLAIN ${Buffer.from("\0m@succieu.fr\0pw").toString("base64")}`);
    assert.ok(srv.log.includes("MAIL FROM:<m@succieu.fr>") && srv.log.includes("RCPT TO:<b@y.fr>"));
  } finally { srv.close(); }
});

test("SMTP : 535 = identifiants, sans fuite du mot de passe ; RCPT sans adresse ; délai", async () => {
  let srv = await fakeSmtp({ authCode: "535 5.7.8 bad credentials" });
  try {
    const err = await sendSmtp({ host: "h", port: srv.port, user: "u@s.fr", password: "pw-secret", from: "u@s.fr", to: ["a@x.fr"], message: "x", connectFn: srv.connectFn }).catch((e) => e);
    assert.match(err.message, /AUTH \(code 535\)/);
    assert.ok(!err.message.includes("pw-secret"));
  } finally { srv.close(); }
  srv = await fakeSmtp({ rcptCode: "550 no such user a@x.fr" });
  try {
    const err = await sendSmtp({ host: "h", port: srv.port, user: "u@s.fr", password: "pw", from: "u@s.fr", to: ["a@x.fr"], message: "x", connectFn: srv.connectFn }).catch((e) => e);
    assert.match(err.message, /RCPT TO \(code 550\)/);
    assert.ok(!err.message.includes("a@x.fr"));
  } finally { srv.close(); }
  srv = await fakeSmtp({ silent: true });
  try {
    await assert.rejects(sendSmtp({ host: "h", port: srv.port, user: "u@s.fr", password: "pw", from: "u@s.fr", to: ["a@x.fr"], message: "x", connectFn: srv.connectFn, timeoutMs: 150 }), /délai dépassé/);
  } finally { srv.close(); }
});

const subFetch = (hookOk = true) => async (url) =>
  url === env.DISCORD_WEBHOOK_ALERTES_MAIRIE ? { ok: hookOk, status: hookOk ? 204 : 500 } : json({ submission: subMail });

test("notify : Discord + mail, deux canaux", async () => {
  const mails = [];
  const smtpFn = async (o) => { mails.push(o); };
  const out = await notify(ID, { env: mailEnv, fetchFn: subFetch(), smtpFn });
  assert.equal(out, "Alerte Discord envoyée. Mail envoyé (2 destinataires).");
  assert.equal(mails[0].host, "ssl0.ovh.net");
  assert.equal(mails[0].port, 465);
  assert.equal(mails[0].from, "moderation@succieu.fr");
  assert.deepEqual(mails[0].to, ["a@x.fr", "b@y.fr"]);
});

test("notify : canaux indépendants", async () => {
  const smtpOk = async () => {};
  const smtpKo = async () => { throw new Error("SMTP : échec à l'étape AUTH (code 535)."); };
  await assert.rejects(notify(ID, { env: mailEnv, fetchFn: subFetch(false), smtpFn: smtpOk }), (e) => /canal Discord.*500/.test(e.message) && /réussi : Mail envoyé/.test(e.message));
  await assert.rejects(notify(ID, { env: mailEnv, fetchFn: subFetch(true), smtpFn: smtpKo }), (e) => /canal mail.*535/.test(e.message) && /réussi : Alerte Discord/.test(e.message));
  await assert.rejects(notify(ID, { env: mailEnv, fetchFn: subFetch(false), smtpFn: smtpKo }), /Aucun canal n'a abouti/);
  const sent = [];
  await assert.rejects(
    notify(ID, { env: { ...mailEnv, MAIL_MODERATION_TO: "a@x.fr, pas-une-adresse" }, fetchFn: subFetch(true), smtpFn: async (o) => { sent.push(o); } }),
    (e) => /canal mail.*adresse invalide/.test(e.message) && /réussi : Alerte Discord/.test(e.message),
  );
  assert.equal(sent.length, 0);
});

test("notify : mail seul, et aucun canal", async () => {
  const noHook = { ...mailEnv, DISCORD_WEBHOOK_ALERTES_MAIRIE: "" };
  assert.equal(await notify(ID, { env: noHook, fetchFn: subFetch(), smtpFn: async () => {} }), "Mail envoyé (2 destinataires).");
  await assert.rejects(notify(ID, { env: { ...noHook, SMTP_USER: "" }, fetchFn: subFetch() }), /Aucun canal/);
});

test("test-mail : envoi d'essai et configuration manquante", async () => {
  let sent;
  assert.match(await testMail({ env: mailEnv, smtpFn: async (o) => { sent = o; } }), /Mail envoyé \(2 destinataires\)/);
  assert.match(sent.message, /Subject: \[Succieu\] Mail d'essai/);
  await assert.rejects(testMail({ env: { ...mailEnv, MAIL_MODERATION_TO: "" } }), /Mail non configuré/);
  assert.match(await main(["test-mail"], { env: mailEnv, smtpFn: async () => {} }), /Mail envoyé/);
});
