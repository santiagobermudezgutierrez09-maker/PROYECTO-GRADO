import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = resolve(projectRoot, "public/icon-source.png");
const iconsDirectory = resolve(projectRoot, "public/icons");
const cream = "#f3eee6";

await mkdir(iconsDirectory, { recursive: true });

const source = sharp(sourcePath).rotate();
const metadata = await source.metadata();
if (!metadata.width || !metadata.height) {
  throw new Error("No se pudieron leer las dimensiones de public/icon-source.png.");
}

const centeredIcon = (size, paddingRatio = 0.12, filename = `icon-${size}.png`) => {
  const innerSize = Math.round(size * (1 - paddingRatio * 2));
  return sharp(sourcePath)
    .rotate()
    .resize(innerSize, innerSize, {
      fit: "inside",
      withoutEnlargement: false,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: Math.floor((size - innerSize) / 2),
      bottom: Math.ceil((size - innerSize) / 2),
      left: Math.floor((size - innerSize) / 2),
      right: Math.ceil((size - innerSize) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(resolve(iconsDirectory, filename));
};

await Promise.all([
  centeredIcon(192, 0.08),
  centeredIcon(512, 0.08),
  centeredIcon(180, 0.08, "apple-touch-icon.png"),
  sharp(sourcePath)
    .rotate()
    .resize(410, 410, {
      fit: "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .flatten({ background: cream })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: cream,
    })
    .png()
    .toFile(resolve(iconsDirectory, "icon-maskable-512.png")),
  sharp(sourcePath)
    .rotate()
    .resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(iconsDirectory, "favicon-32.png")),
  sharp(sourcePath)
    .rotate()
    .resize(16, 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(iconsDirectory, "favicon-16.png")),
]);

console.log(`Íconos regenerados desde ${sourcePath} (${metadata.width}x${metadata.height}).`);
