import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = resolve(projectRoot, "public/icon-source.png");
const iconsDirectory = resolve(projectRoot, "public/icons");
const defaultCream = { r: 243, g: 238, b: 230, alpha: 1 };

await mkdir(iconsDirectory, { recursive: true });

const source = sharp(sourcePath).rotate();
const metadata = await source.metadata();
if (!metadata.width || !metadata.height) {
  throw new Error("No se pudieron leer las dimensiones de public/icon-source.png.");
}

const sourceStats = await sharp(sourcePath).stats();
const isOpaque = sourceStats.isOpaque;
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const sampleCornerColor = async () => {
  const corners = await Promise.all(
    [
      [0, 0],
      [metadata.width - 1, 0],
      [0, metadata.height - 1],
      [metadata.width - 1, metadata.height - 1],
    ].map(async ([left, top]) =>
      sharp(sourcePath)
        .extract({ left, top, width: 1, height: 1 })
        .removeAlpha()
        .raw()
        .toBuffer(),
    ),
  );
  const channels = [0, 1, 2].map((channel) =>
    Math.round(corners.reduce((sum, corner) => sum + corner[channel], 0) / corners.length),
  );
  return { r: channels[0], g: channels[1], b: channels[2], alpha: 1 };
};
const cream = isOpaque ? await sampleCornerColor() : defaultCream;
const iconBackground = isOpaque ? cream : transparent;

const centeredIcon = (
  size,
  paddingRatio = 0.12,
  filename = `icon-${size}.png`,
  background = iconBackground,
  flatten = false,
) => {
  const innerSize = Math.round(size * (1 - paddingRatio * 2));
  const resized = sharp(sourcePath)
    .rotate()
    .resize(innerSize, innerSize, {
      fit: "contain",
      withoutEnlargement: false,
      background,
    });
  const icon = flatten ? resized.flatten({ background }) : resized;
  return icon
    .extend({
      top: Math.floor((size - innerSize) / 2),
      bottom: Math.ceil((size - innerSize) / 2),
      left: Math.floor((size - innerSize) / 2),
      right: Math.ceil((size - innerSize) / 2),
      background,
    })
    .png()
    .toFile(resolve(iconsDirectory, filename));
};

await Promise.all([
  centeredIcon(192, 0.08, "icon-192.png"),
  centeredIcon(512, 0.08, "icon-512.png"),
  centeredIcon(180, 0.08, "apple-touch-icon.png"),
  centeredIcon(512, 0.1, "icon-maskable-512.png", cream, true),
  sharp(sourcePath)
    .rotate()
    .resize(32, 32, { fit: "contain", background: iconBackground })
    .png()
    .toFile(resolve(iconsDirectory, "favicon-32.png")),
  sharp(sourcePath)
    .rotate()
    .resize(16, 16, { fit: "contain", background: iconBackground })
    .png()
    .toFile(resolve(iconsDirectory, "favicon-16.png")),
]);

console.log(`Íconos regenerados desde ${sourcePath} (${metadata.width}x${metadata.height}).`);
