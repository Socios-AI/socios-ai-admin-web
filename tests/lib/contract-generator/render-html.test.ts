import { describe, it, expect } from "vitest";
import { renderContractHtml } from "../../../lib/contract-generator/render-html";
import { buildContractPayload } from "../../../lib/contract-generator/build-payload";
import type { BuildContractInput } from "../../../lib/contract-generator/types";

const input: BuildContractInput = {
  invitationId: "inv-1",
  contractId: "92a6fe79-9ec9-442b-b0cc-aa825f2fc850",
  generatedDate: "2026-07-09",
  counterparty: {
    display_name: "Salão Beleza LTDA", email: "dono@example.com", person_type: "company", country: "BR",
    tax_id: "11444777000161", tax_id_type: "cnpj", company_legal_name: "Salão Beleza LTDA",
    legal_rep_name: "Antonio Sanches", address_city: "São Paulo", address_state: "SP",
  },
  licenseAmountUsd: 15000, territory: "Non-exclusive, no territorial restriction",
  commission: { negotiatedPct: null, recruitBonusPct: 0.5, residualOverridePct: 0.07 },
};

describe("renderContractHtml", () => {
  it("BR: inclui nome, CNPJ e é bilíngue (tem seção pt-BR)", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).toContain("Salão Beleza LTDA");
    expect(html).toContain("11444777000161");
    expect(html.toLowerCase()).toContain("brazil addendum");
  });

  it("não deixa placeholder Handlebars não resolvido", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).not.toMatch(/\{\{/);
  });

  it("US: não inclui addendum do Brasil", () => {
    const b = buildContractPayload({ ...input, counterparty: { ...input.counterparty, country: "US", tax_id_type: "ein", tax_id: "12-3456789" } });
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html.toLowerCase()).not.toContain("brazil addendum");
  });

  it("formata comissão como porcentagem, não fração", () => {
    const b = buildContractPayload(input); if (!b.ok) throw new Error("build");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).toContain("50%");
  });

  it("converte tabelas markdown (sem separador cru |---)", () => {
    const b = buildContractPayload(input); if (!b.ok) throw new Error("build");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).toContain("<table");
    expect(html).not.toContain("|---");
  });

  it("US também recebe o DPA", () => {
    const b = buildContractPayload({ ...input, counterparty: { ...input.counterparty, country: "US", tax_id_type: "ein", tax_id: "12-3456789" } });
    if (!b.ok) throw new Error("build");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html.toLowerCase()).toContain("data processing addendum");
  });

  it("payload esparso (PF sem tax_id nem endereço) não gera artefato ****/crase/residing at ,", () => {
    const b = buildContractPayload({
      ...input,
      counterparty: {
        display_name: "Maria Souza", email: "maria@example.com", person_type: "individual", country: "BR",
      },
    });
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).not.toContain("****");
    expect(html).not.toContain("``");
    expect(html).not.toMatch(/residing at\s*,/i);
    expect(html).not.toMatch(/No\.\s*,/);
    expect(html).not.toMatch(/\{\{/);
  });

  it("capa: logo data URI + metadados na seção .cover", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    const cover = /<section class="cover">([\s\S]*?)<\/section>/.exec(html)?.[1] ?? "";
    expect(cover).toContain("data:image/png;base64,");
    expect(cover).toContain("SAI-BR-2026-92a6fe79");
    expect(cover).toContain("2026-07-09");
    expect(cover).toContain("SOCIOS A.I USA LLC");
    expect(cover).toContain("Salão Beleza LTDA");
  });

  it("CSS: Carta (Letter), fontes da marca embutidas como woff2", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).toContain("size: Letter");
    expect(html).toContain("data:font/woff2;base64,");
    expect(html).toContain('"Space Grotesk"');
    expect(html).toContain('"Plus Jakarta Sans"');
    expect(html).toContain('"DM Mono"');
  });

  it("footer fixo antigo saiu do body (rodapé agora é do Playwright)", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).not.toContain("<footer>");
  });

  it("texto justificado com hifenização por idioma (EN na Parte I, PT na Parte II)", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).toContain("text-align: justify");
    expect(html).toContain("hyphens: auto");
    expect(html).toContain('lang="en"');
    expect(html).toContain('lang="pt-BR"');
  });

  it("CSS anti-viúva: tabelas/headings não quebram e geram página quase vazia", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).toContain("page-break-inside: avoid");
    expect(html).toContain("page-break-after: avoid");
  });

  it("assinatura: página dedicada bilíngue, sem bloco embutido no master", () => {
    const b = buildContractPayload({
      ...input,
      counterparty: { ...input.counterparty, signatory_title: "Sócio Administrador" },
    });
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).not.toContain("Signature Blocks");
    expect(html).toContain("DISCLOSING PARTY / PARTE REVELADORA");
    expect(html).toContain("RECEIVING PARTY / PARTE RECEPTORA");
    expect(html).toContain("Antonio Sanches");
    expect(html).toContain("Sócio Administrador");
    expect(html).toMatch(/Date \/ Data/);
  });

  it("assinatura: BR tem a declaração de ciência de idioma (S2)", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).toContain("DECLARAÇÃO DE CIÊNCIA");
  });

  it("assinatura: US não tem o S2", () => {
    const b = buildContractPayload({ ...input, counterparty: { ...input.counterparty, country: "US", tax_id_type: "ein", tax_id: "12-3456789" } });
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).not.toContain("DECLARAÇÃO DE CIÊNCIA");
    expect(html).toContain("DISCLOSING PARTY / PARTE REVELADORA");
  });

  it("Parte I é EN-only: addendum Brasil sem seção PT embutida", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html.toLowerCase()).toContain("brazil addendum");
    expect(html).not.toContain("ADITIVO BRASIL - TRADUÇÃO DE REFERÊNCIA");
  });

  it("BR: Parte II PT presente com notice e seções espelhadas", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).toContain("PART I");
    expect(html).toContain("PART II");
    expect(html).toContain("tradução de referência, fornecida para conveniência");
    const up = html.toUpperCase();
    expect(up).toContain("PROPRIEDADE INTELECTUAL");
    expect(up).toContain("NÃO CIRCUNVENÇÃO");
    expect(up).toContain("LEI APLICÁVEL E ARBITRAGEM INTERNACIONAL");
    expect(up).toContain("ADITIVO BRASIL");
    expect(up).toContain("CONDIÇÕES COMERCIAIS");
    expect(up).toContain("TRATAMENTO DE DADOS");
  });

  it("BR: Parte II renderiza os dados do payload (não só o texto fixo)", () => {
    const b = buildContractPayload(input);
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    const partII = html.slice(html.indexOf("PART II"));
    expect(partII).toContain("Salão Beleza LTDA");
    expect(partII).toContain("11444777000161");
    expect(partII).toContain("SAI-BR-2026-92a6fe79");
  });

  it("US: sem Parte II nem qualquer tradução de referência", () => {
    const b = buildContractPayload({ ...input, counterparty: { ...input.counterparty, country: "US", tax_id_type: "ein", tax_id: "12-3456789" } });
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).not.toContain("PART II");
    expect(html).not.toContain("TRADUÇÃO DE REFERÊNCIA");
  });

  it("inclui signatário nomeado, document_id e effective_date", () => {
    const b = buildContractPayload({
      ...input,
      counterparty: { ...input.counterparty, legal_rep_name: "Antonio Sanches", signatory_title: "Sócio Administrador" },
    });
    if (!b.ok) throw new Error("build falhou");
    const html = renderContractHtml(b.payload, { country: b.country, addenda: b.addenda });
    expect(html).toContain("Antonio Sanches");
    expect(html).toContain("Sócio Administrador");
    expect(html).toContain("SAI-BR-2026-92a6fe79");
    expect(html).toContain("2026-07-09");
  });
});
