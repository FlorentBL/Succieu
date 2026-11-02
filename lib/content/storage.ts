import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/** Dossier de données hors du build (DATA_DIR, défaut ./data). */
export function dataDir(): string {
  return path.resolve(process.env.DATA_DIR || "./data");
}

export function dataPath(...parts: string[]): string {
  return path.join(dataDir(), ...parts);
}

/** Écriture atomique : fichier temporaire dans le même dossier puis rename. */
export async function writeFileAtomic(file: string, data: string | Buffer): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    const fh = await fs.open(tmp, "w", 0o640);
    try {
      await fh.writeFile(data);
      await fh.sync();
    } finally {
      await fh.close();
    }
    await fs.rename(tmp, file);
  } catch (e) {
    await fs.rm(tmp, { force: true });
    throw e;
  }
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw e;
  }
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await writeFileAtomic(file, JSON.stringify(value, null, 2) + "\n");
}

const queues = new Map<string, Promise<unknown>>();
const STALE_LOCK_MS = 15_000;
const LOCK_WAIT_MS = 10_000;

async function acquireFileLock(lock: string): Promise<() => Promise<void>> {
  const start = Date.now();
  for (;;) {
    try {
      const fh = await fs.open(lock, "wx");
      await fh.close();
      return () => fs.rm(lock, { force: true });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        const st = await fs.stat(lock);
        if (Date.now() - st.mtimeMs > STALE_LOCK_MS) {
          await fs.rm(lock, { force: true });
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() - start > LOCK_WAIT_MS) throw new Error(`Verrou indisponible : ${lock}`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}

/**
 * Exécute `fn` en exclusion mutuelle sur `file` : file d'attente dans le
 * processus + fichier `.lock` (O_EXCL) entre processus.
 */
export async function withLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(file) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(async () => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const release = await acquireFileLock(`${file}.lock`);
    try {
      return await fn();
    } finally {
      await release();
    }
  });
  queues.set(file, run);
  try {
    return await run;
  } finally {
    if (queues.get(file) === run) queues.delete(file);
  }
}

/** Lecture-modification-écriture protégée par le verrou. */
export async function updateJson<T>(
  file: string,
  fallback: T,
  mutate: (current: T) => T | Promise<T>,
): Promise<T> {
  return withLock(file, async () => {
    const next = await mutate(await readJson(file, fallback));
    await writeJson(file, next);
    return next;
  });
}
