import { ApiError, call } from "@/components/bureau/api";

const BASE = "/api/espace-bureau";

export function envoyer<T>(chemin: string, corps: unknown, methode: "POST" | "PATCH" = "POST") {
  return call<T>(`${BASE}${chemin}`, { method: methode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
}

/** Message lisible pour l'utilisateur ; le 409 (modification concurrente) est expliqué. */
export function messageErreur(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 409) return "Ce dossier a été modifié par quelqu’un d’autre entre-temps : la page a été rechargée. Vous pouvez recommencer.";
    if (e.status === 401 || e.code === "unauthorized") return "Vous n’êtes plus connecté. Rechargez la page.";
    if (e.status === 403) return "Vous n’avez pas le droit de modifier ce module.";
    return e.message;
  }
  return "Cela n’a pas marché. Essayez encore.";
}

export { ApiError };
