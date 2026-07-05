import { describe, it, expect } from "vitest";
import { buildContractPayload } from "../../../lib/contract-generator/build-payload";
import { resolveRouting } from "../../../lib/contract-generator/routing";
import type { BuildContractInput } from "../../../lib/contract-generator/types";

const brCompany: BuildContractInput = {
  invitationId: "inv-1",
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
});
