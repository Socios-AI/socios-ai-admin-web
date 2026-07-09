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
