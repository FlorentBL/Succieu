import type { Submission, SubmissionKind } from "@/lib/content/types";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public fields?: Record<string, string>,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init });
  } catch {
    throw new ApiError("network", "Connexion impossible. Vérifiez votre réseau et réessayez.", 0);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* corps non JSON */
  }
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error;
    const retry = Number(res.headers.get("Retry-After")) || undefined;
    throw new ApiError(e?.code ?? "server_error", e?.message ?? "Erreur inattendue.", res.status, e?.fields, retry);
  }
  return data as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const getNames = () => call<{ names: string[] }>("/api/bureau/names").then((r) => r.names);
export const getSession = () => call<{ authenticated: boolean; name?: string }>("/api/bureau/session");
export const login = (name: string, password: string) =>
  call<{ ok: true; name: string }>("/api/bureau/login", json({ name, password }));
export const logout = () => call<{ ok: true }>("/api/bureau/logout", { method: "POST" });
export const getSubmissions = () =>
  call<{ submissions: Submission[] }>("/api/bureau/submissions").then((r) => r.submissions);
export const postSubmission = (kind: SubmissionKind, fields: Record<string, string>) =>
  call<{ submission: Submission }>("/api/bureau/submissions", json({ kind, fields })).then((r) => r.submission);
export function uploadImage(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return call<{ image: string; url: string }>("/api/bureau/uploads", { method: "POST", body: fd });
}
