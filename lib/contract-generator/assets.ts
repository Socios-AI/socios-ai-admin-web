import { readFileSync } from "node:fs";
import { join } from "node:path";

const TEMPLATES_DIR = join(process.cwd(), "lib/contract-generator/templates");
const FONTS_DIR = join(process.cwd(), "lib/contract-generator/assets/fonts");

function b64(path: string): string {
  return readFileSync(path).toString("base64");
}

export function logoDataUri(): string {
  return `data:image/png;base64,${b64(join(TEMPLATES_DIR, "logo.png"))}`;
}

// Fontes da marca vendorizadas (Google Fonts, subset latin, licença OFL).
// Embutidas como data URI pro render Playwright não depender de fontes de
// sistema nem de rede (CI/Docker não têm as fontes da marca).
const FONTS: Array<{ family: string; weight: number; file: string }> = [
  { family: "Space Grotesk", weight: 700, file: "space-grotesk-700.woff2" },
  { family: "Plus Jakarta Sans", weight: 400, file: "plus-jakarta-sans-400.woff2" },
  { family: "Plus Jakarta Sans", weight: 700, file: "plus-jakarta-sans-700.woff2" },
  { family: "DM Mono", weight: 400, file: "dm-mono-400.woff2" },
];

export function fontFaceCss(): string {
  return FONTS.map(
    (f) => `@font-face {
  font-family: "${f.family}";
  font-style: normal;
  font-weight: ${f.weight};
  src: url(data:font/woff2;base64,${b64(join(FONTS_DIR, f.file))}) format("woff2");
}`,
  ).join("\n");
}
