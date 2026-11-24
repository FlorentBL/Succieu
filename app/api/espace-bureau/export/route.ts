import { route } from "@/lib/suivi/api";
import { exporterXlsx } from "@/lib/suivi/export";
import { auditLecture, lireNoms, readData } from "@/lib/suivi/store";

export const dynamic = "force-dynamic";

export const GET = route("read", async (_req, { acteur, ip }) => {
  const { noms } = await lireNoms();
  const buf = exporterXlsx(await readData(), noms);
  await auditLecture(acteur, "export_xlsx", ip);
  const jour = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="suivi-bureau-${jour}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});
