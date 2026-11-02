/** Limitation en mémoire (par processus) : `max` échecs par `windowMs` et par clé. */
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const failures = new Map<string, number[]>();

function recent(key: string, now: number, windowMs: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

/** Secondes à attendre si la clé est bloquée, sinon 0. */
export function retryAfter(
  key: string,
  now = Date.now(),
  max = LOGIN_MAX_ATTEMPTS,
  windowMs = LOGIN_WINDOW_MS,
): number {
  const list = recent(key, now, windowMs);
  if (list.length < max) return 0;
  return Math.ceil((list[0] + windowMs - now) / 1000);
}

export function recordFailure(key: string, now = Date.now(), windowMs = LOGIN_WINDOW_MS): void {
  const list = recent(key, now, windowMs);
  list.push(now);
  failures.set(key, list);
}

export function clearFailures(key: string): void {
  failures.delete(key);
}

export function resetRateLimits(): void {
  failures.clear();
}
