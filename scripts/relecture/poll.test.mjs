import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { poll, buildTaskArgs } from "./poll.mjs";

const A = "a-0123456789abcdef";
const E = "e-fedcba9876543210";
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), "relecture-"));
  const env = { SUCCIEU_BASE_URL: "https://x.test/", REVIEW_API_TOKEN: "t".repeat(24), RELECTURE_STATE_FILE: path.join(dir, "etat.json"), TIMON_BIN: "timon" };
  const calls = [];
  const exec = async (bin, args) => { calls.push([bin, args]); return ""; };
  return { env, calls, exec };
}

test("crée une tâche par saisie et déduplique au passage suivant", async () => {
  const { env, calls, exec } = await setup();
  const fetchFn = async (url, opt) => {
    assert.equal(url, "https://x.test/api/review/submissions");
    assert.equal(opt.headers.Authorization, `Bearer ${env.REVIEW_API_TOKEN}`);
    return json({ submissions: [{ id: A, kind: "article", title: "$(rm -rf /)" }, { id: E, kind: "event" }] });
  };
  let r = await poll({ env, fetchFn, exec });
  assert.equal(r.code, 0);
  assert.equal(calls.length, 2);
  assert.ok(buildTaskArgs({ id: A, kind: "article" }).includes("Relecture article " + A));
  r = await poll({ env, fetchFn, exec });
  assert.equal(r.code, 0);
  assert.equal(r.message, "Rien à faire.");
  assert.equal(calls.length, 2);
});

test("le texte saisi n'apparaît jamais dans les arguments", async () => {
  const { env, calls, exec } = await setup();
  const fetchFn = async () => json({ submissions: [{ id: A, kind: "article", original: { title: "SECRET-TXT" } }] });
  await poll({ env, fetchFn, exec });
  assert.ok(!JSON.stringify(calls).includes("SECRET-TXT"));
});

test("liste vide : sortie 0", async () => {
  const { env, exec } = await setup();
  const r = await poll({ env, exec, fetchFn: async () => json({ submissions: [] }) });
  assert.deepEqual(r, { code: 0, message: "Rien à faire." });
});

test("erreurs réseau et HTTP : sortie 1, rien de consigné", async () => {
  const { env, calls, exec } = await setup();
  let r = await poll({ env, exec, fetchFn: async () => { throw new Error("ECONNREFUSED"); } });
  assert.equal(r.code, 1);
  r = await poll({ env, exec, fetchFn: async () => json({}, 401) });
  assert.equal(r.code, 1);
  assert.match(r.message, /401/);
  assert.equal(calls.length, 0);
});

test("échec de timon : non consigné, repris au passage suivant", async () => {
  const { env, calls } = await setup();
  const fetchFn = async () => json({ submissions: [{ id: A, kind: "article" }] });
  let r = await poll({ env, fetchFn, exec: async () => { throw new Error("boom"); } });
  assert.equal(r.code, 1);
  r = await poll({ env, fetchFn, exec: async (b, a) => { calls.push(a); return ""; } });
  assert.equal(r.code, 0);
  assert.equal(calls.length, 1);
  const state = JSON.parse(await readFile(env.RELECTURE_STATE_FILE, "utf8"));
  assert.ok(state.handed[A]);
});

test("variables manquantes et journal corrompu", async () => {
  const { env, exec } = await setup();
  assert.equal((await poll({ env: {}, exec })).code, 2);
  await writeFile(env.RELECTURE_STATE_FILE, "{pas du json");
  const r = await poll({ env, exec, fetchFn: async () => json({ submissions: [{ id: A, kind: "article" }] }) });
  assert.equal(r.code, 1);
});

test("ignore les identifiants ou types invalides", async () => {
  const { env, calls, exec } = await setup();
  await poll({ env, exec, fetchFn: async () => json({ submissions: [{ id: "x; ls", kind: "article" }, { id: A, kind: "autre" }] }) });
  assert.equal(calls.length, 0);
});
