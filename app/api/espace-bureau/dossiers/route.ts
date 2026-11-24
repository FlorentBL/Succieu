import { corps, route } from "@/lib/suivi/api";
import { creerDossier, filtrerDossiers } from "@/lib/suivi/model";
import { lireNoms, mutate, readData } from "@/lib/suivi/store";
import type { DossierInput, Statut } from "@/lib/suivi/types";

export const dynamic = "force-dynamic";

/** GET ?statut=actif|termine|abandonne|tous&commission=&referent=<id de compte>&bureau=1&q= */
export const GET = route("read", async (req) => {
  const p = new URL(req.url).searchParams;
  const bureau = p.get("bureau");
  const { noms } = await lireNoms();
  const dossiers = filtrerDossiers(
    await readData(),
    {
      statut: (p.get("statut") as Statut | "tous" | null) ?? "actif",
      commission: p.get("commission") ?? undefined,
      referent: p.get("referent") ?? undefined,
      aVoirEnBureau: bureau === null ? undefined : bureau === "1" || bureau === "true",
      q: p.get("q") ?? undefined,
    },
    noms,
  );
  return { dossiers };
});

export const POST = route("write", async (req, { acteur, ip }) => {
  const input = (await corps(req)) as DossierInput;
  const { noms } = await lireNoms();
  const dossier = await mutate(
    acteur,
    (data) => {
      const d = creerDossier(data, input, noms);
      return { result: d, audit: [{ action: "dossier_cree", cible: d.id, detail: d.titre }] };
    },
    ip,
  );
  return Response.json(dossier, { status: 201, headers: { "Cache-Control": "no-store" } });
});
