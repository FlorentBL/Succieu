import { dataPath, readJson } from "./storage";

/** Noms du bureau : data/bureau.json = ["Prénom Nom", ...], éditable à la main. */
export async function getBureauNames(): Promise<string[]> {
  const v = await readJson<unknown>(dataPath("bureau.json"), []);
  if (!Array.isArray(v)) return [];
  return v.filter((n): n is string => typeof n === "string" && n.trim() !== "").map((n) => n.trim());
}

export async function isBureauMember(name: string): Promise<boolean> {
  return (await getBureauNames()).includes(name);
}
