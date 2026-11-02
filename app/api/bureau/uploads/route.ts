import { requireBureau } from "@/lib/auth/guards";
import { handle, ok } from "@/lib/auth/http";
import { assertSameOrigin } from "@/lib/auth/origin";
import { AppError } from "@/lib/content/errors";
import { MAX_IMAGE_BYTES, saveImage } from "@/lib/content/images";

export const dynamic = "force-dynamic";

/** multipart/form-data, champ "file". Retourne { image } à placer dans fields.image. */
export const POST = handle(async (req) => {
  assertSameOrigin(req);
  await requireBureau();
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES + 64 * 1024) {
    throw new AppError("payload_too_large", "Image trop lourde (3 Mo maximum).");
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AppError("validation_failed", "Formulaire multipart attendu.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new AppError("validation_failed", "Fichier requis.", { fields: { file: "Image : champ obligatoire." } });
  }
  const name = await saveImage(Buffer.from(await file.arrayBuffer()));
  return ok({ image: name, url: `/api/uploads/${name}` }, { status: 201 });
});
