import { describe, it, expect } from "vitest";
import { buildContractPayload } from "../../../lib/contract-generator/build-payload";
import { resolveRouting } from "../../../lib/contract-generator/routing";
import type { BuildContractInput } from "../../../lib/contract-generator/types";

const brCompany: BuildContractInput = {
  invitationId: "inv-1",
  contractId: "92a6fe79-9ec9-442b-b0cc-aa825f2fc850",
  generatedDate: "2026-07-09",
  counterparty: {
    display_name: "Salão Beleza LTDA",
    email: "dono@example.com",
    person_type: "company",
    country: "BR",
    tax_id: "11444777000161",
    tax_id_type: "cnpj",
    company_legal_name: "Salão Beleza LTDA",
    legal_rep_name: "Antonio Sanches",
    legal_rep_tax_id: "39053344705",
    address_postal_code: "01310100",
    address_line1: "Av Paulista",
    address_number: "1000",
    address_city: "São Paulo",
    address_state: "SP",
  },
  licenseAmountUsd: 15000,
  territory: "Non-exclusive, no territorial restriction",
  commission: { negotiatedPct: null, recruitBonusPct: 0.5, residualOverridePct: 0.07 },
};

describe("buildContractPayload · trava de dados completos (F3)", () => {
  it("falta tax_id → MISSING_FIELD nomeando o documento", () => {
    const b = buildContractPayload({
      ...brCompany,
      counterparty: { ...brCompany.counterparty, tax_id: undefined },
    });
    expect(b.ok).toBe(false);
    if (b.ok) return;
    expect(b.reason).toBe("MISSING_FIELD");
    expect(b.message).toContain("CNPJ");
  });

  it("falta endereço inteiro → lista logradouro, cidade, UF e CEP", () => {
    const b = buildContractPayload({
      ...brCompany,
      counterparty: {
        ...brCompany.counterparty,
        address_line1: undefined, address_city: undefined, address_state: undefined, address_postal_code: undefined,
      },
    });
    expect(b.ok).toBe(false);
    if (b.ok) return;
    expect(b.reason).toBe("MISSING_FIELD");
    for (const campo of ["logradouro", "cidade", "UF", "CEP"]) {
      expect(b.message).toContain(campo);
    }
  });

  it("PJ sem legal_rep_name → exige representante legal", () => {
    const b = buildContractPayload({
      ...brCompany,
      counterparty: { ...brCompany.counterparty, legal_rep_name: undefined },
    });
    expect(b.ok).toBe(false);
    if (b.ok) return;
    expect(b.message).toContain("representante legal");
  });

  it("PF completa não exige representante legal", () => {
    const b = buildContractPayload({
      ...brCompany,
      counterparty: {
        ...brCompany.counterparty,
        person_type: "individual", company_legal_name: undefined, legal_rep_name: undefined,
        display_name: "Maria Souza", tax_id: "39053344705", tax_id_type: "cpf",
      },
    });
    expect(b.ok).toBe(true);
  });

  it("coleta TODOS os faltantes numa única mensagem", () => {
    const b = buildContractPayload({
      ...brCompany,
      counterparty: {
        ...brCompany.counterparty,
        tax_id: undefined, legal_rep_name: undefined, address_city: undefined,
      },
    });
    expect(b.ok).toBe(false);
    if (b.ok) return;
    expect(b.message).toContain("CNPJ");
    expect(b.message).toContain("representante legal");
    expect(b.message).toContain("cidade");
  });

  it("input completo segue ok", () => {
    expect(buildContractPayload(brCompany).ok).toBe(true);
  });
});

describe("resolveRouting", () => {
  it("BR → Brazil addendum + LGPD DPA + tradução pt-BR", () => {
    const r = resolveRouting("BR");
    expect(r.addenda).toContain("BRAZIL_ADDENDUM_EN_PTBR");
    expect(r.addenda).toContain("LGPD_DPA");
    expect(r.controllingLanguage).toBe("en-US");
    expect(r.referenceLanguage).toBe("pt-BR");
  });
  it("US → US addendum, sem tradução", () => {
    const r = resolveRouting("US");
    expect(r.addenda).toContain("US_ADDENDUM");
    expect(r.referenceLanguage).toBeNull();
  });
});

describe("buildContractPayload", () => {
  it("BR PJ: labels fiscais e dados corretos", () => {
    const res = buildContractPayload(brCompany);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.country).toBe("BR");
    expect(res.payload.counterparty.is_legal_entity).toBe(true);
    expect(res.payload.counterparty.primary_tax_id_label).toBe("CNPJ");
    expect(res.payload.counterparty.primary_tax_id_value).toBe("11444777000161");
    expect(res.payload.counterparty.legal_rep_name).toBe("Antonio Sanches");
    expect(res.payload.socios.legal_name).toBe("SOCIOS A.I USA LLC");
    expect(res.payload.commercial.fees.licensing_fee_amount).toBe(15000);
  });

  it("comissão: default 50% líquido, bônus 50%, override 7%", () => {
    const res = buildContractPayload(brCompany);
    if (!res.ok) return;
    expect(res.payload.commercial.commission.net_profit_percentage).toBe(0.5);
    expect(res.payload.commercial.commission.licensing_fee_percentage).toBe(0.5);
    expect(res.payload.commercial.commission.residual_percentage).toBe(0.07);
  });

  it("comissão negociada sobrescreve o default", () => {
    const res = buildContractPayload({ ...brCompany, commission: { negotiatedPct: 0.6, recruitBonusPct: 0.5, residualOverridePct: 0.07 } });
    if (!res.ok) return;
    expect(res.payload.commercial.commission.net_profit_percentage).toBe(0.6);
  });

  it("hash é determinístico pro mesmo input", () => {
    const a = buildContractPayload(brCompany);
    const b = buildContractPayload(brCompany);
    if (!a.ok || !b.ok) return;
    expect(a.payloadHash).toBe(b.payloadHash);
    expect(a.payloadHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("payloads diferentes geram hashes diferentes", () => {
    const a = buildContractPayload(brCompany);
    const b = buildContractPayload({ ...brCompany, licenseAmountUsd: 20000 });
    if (!a.ok || !b.ok) throw new Error("build falhou");
    expect(a.payloadHash).not.toBe(b.payloadHash);
  });

  it("não trata 'nonexclusive' nem 'non - exclusive' como exclusivo", () => {
    for (const territory of ["nonexclusive territory", "non - exclusive"]) {
      expect(buildContractPayload({ ...brCompany, territory }).ok).toBe(true);
    }
  });

  it("fail-closed: país não suportado", () => {
    const res = buildContractPayload({ ...brCompany, counterparty: { ...brCompany.counterparty, country: "PT" as unknown as "BR" } });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("UNSUPPORTED_COUNTRY");
  });

  it("fail-closed: território exclusivo dispara revisão", () => {
    const res = buildContractPayload({ ...brCompany, territory: "Exclusive - São Paulo" });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("EXCLUSIVE_TERRITORY");
  });

  it("fail-closed: PJ sem razão social", () => {
    const res = buildContractPayload({ ...brCompany, counterparty: { ...brCompany.counterparty, company_legal_name: undefined } });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("MISSING_FIELD");
  });

  it("gera document_id determinístico SAI-{PAÍS}-{ANO}-{8hex}", () => {
    const b = buildContractPayload(brCompany);
    if (!b.ok) throw new Error("build falhou");
    expect(b.payload.agreement.document_id).toBe("SAI-BR-2026-92a6fe79");
  });

  it("effective_date é a data de geração passada", () => {
    const b = buildContractPayload(brCompany);
    if (!b.ok) throw new Error("build falhou");
    expect(b.payload.agreement.effective_date).toBe("2026-07-09");
  });

  it("PJ: signatory usa legal_rep_name + signatory_title informado", () => {
    const b = buildContractPayload({
      ...brCompany,
      counterparty: { ...brCompany.counterparty, legal_rep_name: "Antonio Sanches", signatory_title: "Sócio Administrador" },
    });
    if (!b.ok) throw new Error("build falhou");
    expect(b.payload.counterparty.signatory).toEqual({ full_name: "Antonio Sanches", title: "Sócio Administrador" });
    expect(b.payload.counterparty.is_individual).toBe(false);
  });

  it("PJ: signatory_title vazio cai no fallback 'Legal Representative'", () => {
    const b = buildContractPayload({
      ...brCompany,
      counterparty: { ...brCompany.counterparty, legal_rep_name: "Antonio Sanches", signatory_title: undefined },
    });
    if (!b.ok) throw new Error("build falhou");
    expect(b.payload.counterparty.signatory.title).toBe("Legal Representative");
  });

  it("PF: signatory é o próprio titular", () => {
    const b = buildContractPayload({
      ...brCompany,
      counterparty: { ...brCompany.counterparty, person_type: "individual", company_legal_name: undefined, display_name: "Maria Souza" },
    });
    if (!b.ok) throw new Error("build falhou");
    expect(b.payload.counterparty.signatory).toEqual({ full_name: "Maria Souza", title: "Holder" });
    expect(b.payload.counterparty.is_individual).toBe(true);
  });
});
