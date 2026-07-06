import { readFileSync } from "node:fs";
import { join } from "node:path";
import Handlebars from "handlebars";
import type { ContractCountry, ContractPayload } from "./types";

const DIR = join(process.cwd(), "lib/contract-generator/templates");

function read(name: string): string {
  return readFileSync(join(DIR, name), "utf-8");
}

// Markdown simples → HTML (títulos, parágrafos, listas). Evita dep pesada.
function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h${h[1].length}>${h[2]}</h${h[1].length}>`);
    } else if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`);
    } else if (line.trim() === "") {
      if (inList) { out.push("</ul>"); inList = false; }
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<p>${line}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function brandCss(): string {
  const tokens = JSON.parse(read("brand_tokens.json")) as {
    colors?: Record<string, string>;
  };
  const black = tokens.colors?.black ?? "#000000";
  const green = tokens.colors?.green ?? "#8DF78D";
  const off = tokens.colors?.offwhite ?? "#EDE7E6";
  return `
    @page { margin: 24mm 18mm; }
    body { font-family: Arial, Calibri, sans-serif; color: ${black}; font-size: 11pt; line-height: 1.5; }
    h1 { font-size: 18pt; border-bottom: 3px solid ${green}; padding-bottom: 6px; }
    h2 { font-size: 14pt; margin-top: 18px; }
    h3 { font-size: 12pt; }
    .cover { background: ${off}; padding: 24px; }
    .addendum { page-break-before: always; }
    footer { position: fixed; bottom: 0; font-size: 8pt; color: #666; }
  `;
}

export function renderContractHtml(
  payload: ContractPayload,
  opts: { country: ContractCountry; addenda: string[] },
): string {
  const sections: string[] = [];
  sections.push(mdToHtml(Handlebars.compile(read("master_partner_agreement_en.md"))(payload)));
  sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("commercial_terms_schedule_en.md"))(payload))}</div>`);

  if (opts.addenda.includes("BRAZIL_ADDENDUM_EN_PTBR")) {
    sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("brazil_addendum_en_ptbr.md"))(payload))}</div>`);
  }
  if (opts.addenda.some((a) => a.endsWith("DPA"))) {
    sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("global_dpa_base_en.md"))(payload))}</div>`);
  }

  return `<!doctype html><html><head><meta charset="utf-8"><style>${brandCss()}</style></head>
    <body>${sections.join("\n")}
    <footer>Confidential | SOCIOS A.I USA LLC</footer>
    </body></html>`;
}
