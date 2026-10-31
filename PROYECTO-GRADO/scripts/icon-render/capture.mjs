import { createRequire } from "node:module";
import { existsSync, mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const cliPath = process.env.PATH.split(":")
  .map((directory) => join(directory, "playwright"))
  .find(existsSync);

if (!cliPath) {
  throw new Error("Ejecuta este script mediante npm exec --package=playwright.");
}

const playwrightPackage = dirname(realpathSync(cliPath));
const require = createRequire(join(dirname(playwrightPackage), "package.json"));
const { chromium } = require("playwright");
const projectRoot = resolve(import.meta.dirname, "../..");
const captureUrl = "http://127.0.0.1:4173/scripts/icon-render/capture.html?capturarDona";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--disable-gpu-sandbox",
  ],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(captureUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".mascota-canvas canvas");
  await page.waitForTimeout(1100);

  const dataUrl = await page.locator(".mascota-canvas canvas").evaluate((canvas) => {
    if (canvas.width < 1024 || canvas.height < 1024) {
      throw new Error(`Canvas inesperado: ${canvas.width}x${canvas.height}`);
    }
    return canvas.toDataURL("image/png");
  });

  if (!dataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("La captura no produjo un PNG válido.");
  }
  if (pageErrors.length) {
    throw new Error(`Errores al renderizar la mascota: ${pageErrors.join("; ")}`);
  }

  const output = join(projectRoot, "public/icon-source.png");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"));
  console.log(`Captura guardada en ${output}`);
} finally {
  await browser.close();
}
