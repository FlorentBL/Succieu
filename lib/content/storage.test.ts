import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import sharp from "sharp";
import { detectImageExt, imageExists, saveImage } from "./images";
import { parseReview } from "./validation";
import { createSubmission, getPublishedArticles, getUpcomingEvents, getSubmission, publishSubmission, listSubmissions, submitReview } from "./store";
import { readJson, updateJson, withLock, writeFileAtomic } from "./storage";

let dir: string;
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "succieu-test-"));
  process.env.DATA_DIR = dir;
});
after(() => fs.rm(dir, { recursive: true, force: true }));

test("écriture atomique : pas de fichier temporaire résiduel", async () => {
  const f = path.join(dir, "atomic.json");
  await writeFileAtomic(f, '{"a":1}');
  await writeFileAtomic(f, '{"a":2}');
  assert.deepEqual(await readJson(f, null), { a: 2 });
  assert.deepEqual((await fs.readdir(dir)).filter((n) => n.startsWith("atomic.json.")), []);
});

test("lecture d'un fichier absent : valeur de repli", async () => {
  assert.deepEqual(await readJson(path.join(dir, "absent.json"), []), []);
});

test("verrou : mises à jour concurrentes sans perte", async () => {
  const f = path.join(dir, "counter.json");
  await Promise.all(
    Array.from({ length: 25 }, () => updateJson<number>(f, 0, async (n) => {
      await new Promise((r) => setTimeout(r, 1));
      return n + 1;
    })),
  );
  assert.equal(await readJson(f, 0), 25);
  await withLock(f, async () => undefined);
  await assert.rejects(fs.access(`${f}.lock`));
});

test("images : signatures jpeg/png/webp, rejet du reste", async () => {
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]);
  assert.equal(detectImageExt(jpg), "jpg");
  assert.equal(detectImageExt(png), "png");
  assert.equal(detectImageExt(webp), "webp");
  assert.equal(detectImageExt(Buffer.from("<svg></svg>")), null);
  const big = await sharp({ create: { width: 3000, height: 1500, channels: 3, background: "#2f7a34" } })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Copyright: "secret" } } })
    .toBuffer();
  const name = await saveImage(big);
  assert.match(name, /^[a-f0-9]{32}\.webp$/);
  const meta = await sharp(await fs.readFile(path.join(process.env.DATA_DIR!, "uploads", name))).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 2000);
  assert.equal(meta.height, 1000);
  assert.equal(meta.exif, undefined);
  await assert.rejects(saveImage(jpg), { code: "unsupported_media" });
  await assert.rejects(saveImage(Buffer.from("GIF89a....")), { code: "unsupported_media" });
  await assert.rejects(saveImage(Buffer.alloc(40 * 1024 * 1024 + 1, 0xff)), { code: "payload_too_large" });
});

test("cycle complet : saisie, relecture, publication, lecture publique", async () => {
  const art = {
    title: "T", summary: "S", body: "B", publishedAt: "2026-01-01",
  };
  const a = await createSubmission("Auteur", "article", art);
  const b = await createSubmission("Autre", "article", { ...art, title: "Futur", publishedAt: "2999-01-01" });
  assert.equal(await getPublishedArticles().then((l) => l.length), 0);
  await submitReview(a.id, { ok: true, issues: [], summary: "ok", corrected: { ...art, title: "T corrigé" } });
  await publishSubmission(a.id, "corrected");
  await publishSubmission(b.id, "original");
  const pub = await getPublishedArticles();
  assert.deepEqual(pub.map((p) => p.fields.title), ["T corrigé"], "date future masquée");
  assert.equal((await getPublishedArticles(0)).length, 1);
  assert.equal((await getSubmission(a.id)).history.length, 3);
  assert.equal((await listSubmissions({ author: "Autre" })).length, 1);

  const ev = (date: string, startTime?: string) => ({ title: "E", date, place: "P", description: "D", startTime });
  const ids: string[] = [];
  for (const e of [ev("2026-12-02", "10:00"), ev("2026-12-02", "08:00"), ev("2026-10-01")]) {
    ids.push((await createSubmission("Auteur", "event", e)).id);
  }
  for (const id of ids) await publishSubmission(id, "original");
  const up = await getUpcomingEvents("2026-11-01");
  assert.deepEqual(up.map((e) => e.fields.startTime), ["08:00", "10:00"]);
  await assert.rejects(getSubmission("a-ffffffffffffffff"), { code: "not_found" });
  await assert.rejects(getSubmission("../etc"), { code: "not_found" });
  await assert.rejects(createSubmission("A", "article", { ...art, image: "0".repeat(32) + ".png" }), { code: "validation_failed" });
});

test("avis : une image corrigée inexistante est refusée, une image existante acceptée", async () => {
  const art = { title: "T", summary: "S", body: "B", publishedAt: "2026-11-02" };
  const ghost = "0".repeat(32) + ".jpg";
  await assert.rejects(
    () => parseReview("article", { ok: true, summary: "r", corrected: { ...art, image: ghost } }, imageExists),
    (e: unknown) => (e as { fields?: Record<string, string> }).fields?.["corrected.image"] !== undefined,
  );
  const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#ffffff" } }).png().toBuffer();
  const name = await saveImage(png);
  const r = await parseReview("article", { ok: true, summary: "r", corrected: { ...art, image: name } }, imageExists);
  assert.equal((r.corrected as { image?: string }).image, name);
});
