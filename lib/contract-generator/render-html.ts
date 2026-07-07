import { readFileSync } from "node:fs";
import { join } from "node:path";
import Handlebars from "handlebars";
import { marked } from "marked";
import type { ContractCountry, ContractPayload } from "./types";

const DIR = join(process.cwd(), "lib/contract-generator/templates");

marked.setOptions({ gfm: true });

Handlebars.registerHelper("pct", (v) => (typeof v === "number" ? `${+(v * 100).toFixed(2)}%` : v));

function read(name: string): string {
  return readFileSync(join(DIR, name), "utf-8");
}

function mdToHtml(md: string): string {
  return marked.parse(md) as string;
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
  // DPA é obrigatório sempre que há processamento de dados pessoais (§13 do master
  // agreement), não só quando um addendum específico (ex.: LGPD_DPA) está presente.
  // O próprio template global_dpa_base_en.md seleciona o módulo regional (US vs LGPD)
  // via {{#unless agreement.reference_language}}.
  sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("global_dpa_base_en.md"))(payload))}</div>`);

  return `<!doctype html><html><head><meta charset="utf-8"><style>${brandCss()}</style></head>
    <body>${sections.join("\n")}
    <footer>Confidential | SOCIOS A.I USA LLC</footer>
    </body></html>`;
}
