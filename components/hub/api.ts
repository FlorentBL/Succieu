import { call } from "@/components/bureau/api";

export { ApiError } from "@/components/bureau/api";

export type HubSession = { authenticated: true };

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const hubLogin = (identifier: string, password: string) =>
  call<HubSession>("/api/hub/login", json({ identifier, password }));
export const hubLogout = () => call<{ ok: true }>("/api/hub/logout", { method: "POST" });

/** Message lisible pour une limitation de tentatives. */
export function waitMessage(retryAfter?: number): string {
  const min = retryAfter ? Math.max(1, Math.ceil(retryAfter / 60)) : null;
  return `Trop de tentatives. Patientez ${min ? `environ ${min} minute${min > 1 ? "s" : ""}` : "quelques minutes"} avant de réessayer.`;
}
