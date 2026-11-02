import { NextResponse } from "next/server";
import { readImage } from "@/lib/content/images";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const img = await readImage(name);
  if (!img) {
    return NextResponse.json({ error: { code: "not_found", message: "Image introuvable." } }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
