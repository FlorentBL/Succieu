import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import { AppError } from "./errors";
import { IMAGE_NAME_RE } from "./validation";
import { dataPath, writeFileAtomic } from "./storage";

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export const IMAGE_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

/** Détecte le format par signature (le type MIME déclaré est ignoré). */
export function detectImageExt(buf: Uint8Array): "jpg" | "png" | "webp" | null {
  const b = buf;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (
    b.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)
  ) {
    return "png";
  }
  if (
    b.length >= 12 &&
    String.fromCharCode(...b.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.subarray(8, 12)) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/** Valide et enregistre l'image sous un nom aléatoire ; retourne ce nom. */
export async function saveImage(buf: Buffer): Promise<string> {
  if (buf.length === 0) {
    throw new AppError("validation_failed", "Fichier vide.");
  }
  if (buf.length > MAX_IMAGE_BYTES) {
    throw new AppError("payload_too_large", "Image trop lourde (3 Mo maximum).");
  }
  const ext = detectImageExt(buf);
  if (!ext) {
    throw new AppError("unsupported_media", "Format d'image non accepté (jpeg, png ou webp).");
  }
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFileAtomic(dataPath("uploads", name), buf);
  return name;
}

export async function readImage(
  name: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  if (!IMAGE_NAME_RE.test(name)) return null;
  try {
    const data = await fs.readFile(dataPath("uploads", name));
    const ext = name.split(".")[1] as keyof typeof IMAGE_TYPES;
    return { data, contentType: IMAGE_TYPES[ext] };
  } catch {
    return null;
  }
}

export async function imageExists(name: string): Promise<boolean> {
  if (!IMAGE_NAME_RE.test(name)) return false;
  try {
    await fs.access(dataPath("uploads", name));
    return true;
  } catch {
    return false;
  }
}
