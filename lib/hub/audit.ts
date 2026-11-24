import { promises as fs } from "node:fs";
import { dataPath } from "../content/storage";

export type AuditEntry = { actor: string; action: string; detail?: string; ip?: string };

/**
 * Journal d'audit DATA_DIR/hub-audit.jsonl (une ligne JSON par événement).
 * Ne jamais y passer de mot de passe ni d'empreinte.
 */
export async function audit(e: AuditEntry): Promise<void> {
  const line = JSON.stringify({ date: new Date().toISOString(), ...e }) + "\n";
  const file = dataPath("hub-audit.jsonl");
  await fs.mkdir(dataPath(), { recursive: true });
  await fs.appendFile(file, line, { mode: 0o640 });
}
