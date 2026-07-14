import { readFileSync } from "node:fs";
import { join } from "node:path";
import Handlebars from "handlebars";
import { marked } from "marked";
import { fontFaceCss, logoDataUri } from "./assets";
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
  // brand_tokens.json usa o shape do kit: { brand: { colors: { black: { hex } } } }.
  const tokens = JSON.parse(read("brand_tokens.json")) as {
    brand?: { colors?: Record<string, { hex?: string }> };
  };
  const color = (key: string, fallback: string) => tokens.brand?.colors?.[key]?.hex ?? fallback;
  const black = color("black", "#000000");
  const green = color("prosperity_green", "#8DF78D");
  const off = color("off_white", "#EDE7E6");
  return `
    ${fontFaceCss()}
    @page { size: A4; margin: 24mm 18mm; }
    body { font-family: "Plus Jakarta Sans", Arial, Calibri, sans-serif; color: ${black}; font-size: 10.5pt; line-height: 1.5; }
    h1, h2, h3 { font-family: "Space Grotesk", Arial, sans-serif; }
    h1 { font-size: 17pt; border-bottom: 3px solid ${green}; padding-bottom: 6px; }
    h2 { font-size: 13pt; margin-top: 18px; }
    h3 { font-size: 11pt; }
    code { font-family: "DM Mono", Consolas, monospace; font-size: 9.5pt; }
    table { border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; }
    th { background: ${off}; text-align: left; }
    .cover { page-break-after: always; padding-top: 36mm; }
    .cover img { height: 40px; }
    .cover h1 { border-bottom: none; font-size: 22pt; margin-top: 28mm; }
    .cover .meta { background: ${off}; border-top: 4px solid ${green}; margin-top: 22mm; padding: 18px 22px; }
    .cover .meta table { width: 100%; font-family: "DM Mono", Consolas, monospace; font-size: 9.5pt; }
    .cover .meta th, .cover .meta td { border: none; padding: 5px 8px; }
    .cover .meta th { background: none; white-space: nowrap; color: #444; font-weight: 400; }
    .addendum { page-break-before: always; }
  `;
}

function coverHtml(payload: ContractPayload, country: ContractCountry): string {
  const a = payload.agreement;
  const c = payload.counterparty;
  const partnerName = c.is_legal_entity ? (c.legal_name ?? c.display_name) : c.display_name;
  const row = (label: string, value: string) => `<tr><th>${label}</th><td>${value}</td></tr>`;
  return `<section class="cover">
    <img src="${logoDataUri()}" alt="Sócios AI" />
    <h1>MASTER SOFTWARE LICENSE, COMMERCIAL PARTNERSHIP AND CONFIDENTIALITY AGREEMENT</h1>
    <div class="meta"><table>
      ${row("Document ID", a.document_id)}
      ${row("Template Version", a.version)}
      ${row("Effective Date", a.effective_date)}
      ${row("Disclosing Party", payload.socios.legal_name)}
      ${row("Receiving Party", partnerName)}
      ${row("Country / Route", country)}
      ${row("Controlling Language", a.controlling_language)}
      ${a.reference_language ? row("Reference Language", a.reference_language) : ""}
    </table></div>
  </section>`;
}

export function renderContractHtml(
  payload: ContractPayload,
  opts: { country: ContractCountry; addenda: string[] },
): string {
  const divider = (title: string) => `<div class="addendum part-divider"><h1>${title}</h1></div>`;

  const sections: string[] = [];
  sections.push(coverHtml(payload, opts.country));
  sections.push(divider("PART I · ENGLISH CONTROLLING VERSION / VERSÃO EM INGLÊS (REGENTE)"));
  sections.push(mdToHtml(Handlebars.compile(read("master_partner_agreement_en.md"))(payload)));
  sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("commercial_terms_schedule_en.md"))(payload))}</div>`);

  // O token de routing continua BRAZIL_ADDENDUM_EN_PTBR (contrato bilíngue no
  // pacote); o arquivo em si é só EN, a tradução PT vive na Parte II.
  if (opts.addenda.includes("BRAZIL_ADDENDUM_EN_PTBR")) {
    sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("brazil_addendum_en.md"))(payload))}</div>`);
  }
  // DPA é obrigatório sempre que há processamento de dados pessoais (§13 do master
  // agreement), não só quando um addendum específico (ex.: LGPD_DPA) está presente.
  // O próprio template global_dpa_base_en.md seleciona o módulo regional (US vs LGPD)
  // via {{#unless agreement.reference_language}}.
  sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("global_dpa_base_en.md"))(payload))}</div>`);

  // Parte II: tradução de referência pt-BR, só pra rota BR. Espelha a Parte I
  // seção a seção (mesmos placeholders; paridade garantida por teste).
  if (payload.agreement.reference_language === "pt-BR") {
    sections.push(divider("PART II · PORTUGUESE REFERENCE TRANSLATION / TRADUÇÃO DE REFERÊNCIA EM PORTUGUÊS"));
    sections.push(mdToHtml(read("locales/pt-BR/translation_notice_ptBR.md")));
    sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("locales/pt-BR/master_partner_agreement_ptBR.md"))(payload))}</div>`);
    sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("locales/pt-BR/commercial_terms_schedule_ptBR.md"))(payload))}</div>`);
    if (opts.addenda.includes("BRAZIL_ADDENDUM_EN_PTBR")) {
      sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("locales/pt-BR/brazil_addendum_ptBR.md"))(payload))}</div>`);
    }
    sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("locales/pt-BR/global_dpa_base_ptBR.md"))(payload))}</div>`);
  }

  // Página de assinatura bilíngue dedicada, sempre a última seção do pacote
  // (o master não tem mais bloco de assinatura embutido).
  sections.push(`<div class="addendum">${mdToHtml(Handlebars.compile(read("signature_page.md"))(payload))}</div>`);

  // Rodapé (Confidential + Document ID + página N/M) é responsabilidade do
  // footerTemplate do Playwright em render-pdf.ts; Chromium não suporta
  // @page margin boxes, então nada de footer fixo aqui.
  return `<!doctype html><html><head><meta charset="utf-8"><style>${brandCss()}</style></head>
    <body>${sections.join("\n")}
    </body></html>`;
}
