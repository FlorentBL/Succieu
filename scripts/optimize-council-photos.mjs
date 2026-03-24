/**
 * Réduit le poids des portraits dans public/photos/ (conseil municipal).
 * Cible affichage web ~400px de large → export max 960px de bord, JPEG ~82 %.
 *
 * Usage : npm run optimize:photos
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = path.join(__dirname, "..", "public", "photos");

const MAX_WIDTH = 960;
const MAX_HEIGHT = 1280;
const JPEG_QUALITY = 82;

async function main() {
  const entries = fs.readdirSync(PHOTOS_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => name !== ".gitkeep");

  const imageFiles = files.filter((name) =>
    /\.(jpe?g|png)$/i.test(name),
  );

  if (imageFiles.length === 0) {
    console.log("Aucune image dans public/photos.");
    return;
  }

  for (const file of imageFiles) {
    const fullPath = path.join(PHOTOS_DIR, file);
    const lower = file.toLowerCase();
    const isPng = lower.endsWith(".png");

    const pipeline = sharp(fullPath)
      .rotate()
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      });

    if (isPng) {
      const outName = file.replace(/\.png$/i, ".jpg");
      const outPath = path.join(PHOTOS_DIR, outName);
      await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(outPath);
      await fs.promises.unlink(fullPath);
      const before = (await fs.promises.stat(outPath)).size;
      console.log(`OK ${file} → ${outName} (${(before / 1024).toFixed(0)} Ko)`);
    } else {
      const tmpPath = `${fullPath}.opt.tmp`;
      await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toFile(tmpPath);
      const stat = await fs.promises.stat(tmpPath);
      await fs.promises.rename(tmpPath, fullPath);
      console.log(`OK ${file} (${(stat.size / 1024).toFixed(0)} Ko)`);
    }
  }

}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
