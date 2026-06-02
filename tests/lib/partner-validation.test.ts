import { describe, it, expect } from "vitest";
import {
  isValidCPF, isValidCNPJ, isValidABA, isValidEIN, isValidCEP, isValidZIP,
  partnerProfileSchema, partnerPayoutSchema, prefillProfileSchema,
} from "../../lib/partner-validation";

describe("document validators", () => {
  it("CPF", () => {
    expect(isValidCPF("529.982.247-25")).toBe(true);
    expect(isValidCPF("52998224725")).toBe(true);
    expect(isValidCPF("11111111111")).toBe(false);
    expect(isValidCPF("52998224724")).toBe(false);
  });
  it("CNPJ", () => {
    expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
    expect(isValidCNPJ("11222333000180")).toBe(false);
  });
  it("ABA routing", () => {
    expect(isValidABA("021000021")).toBe(true);
    expect(isValidABA("021000020")).toBe(false);
  });
  it("EIN format", () => {
    expect(isValidEIN("12-3456789")).toBe(true);
    expect(isValidEIN("123456789")).toBe(true);
    expect(isValidEIN("12-345")).toBe(false);
  });
  it("CEP / ZIP", () => {
    expect(isValidCEP("01001-000")).toBe(true);
    expect(isValidCEP("0100100")).toBe(false);
    expect(isValidZIP("94103")).toBe(true);
    expect(isValidZIP("94103-1234")).toBe(true);
    expect(isValidZIP("9410")).toBe(false);
  });
});

describe("partnerProfileSchema", () => {
  it("aceita BR PJ válido", () => {
    const r = partnerProfileSchema.safeParse({
      country: "BR", person_type: "company", tax_id: "11.222.333/0001-81",
      company_legal_name: "ACME LTDA", phone: "+5511999998888",
      address_postal_code: "01001-000", address_city: "São Paulo",
      address_state: "SP", address_line1: "Praça da Sé", address_number: "1",
    });
    expect(r.success).toBe(true);
  });
  it("rejeita CPF inválido em BR PF", () => {
    const r = partnerProfileSchema.safeParse({
      country: "BR", person_type: "individual", tax_id: "52998224724",
      phone: "+5511999998888", address_postal_code: "01001-000",
      address_city: "São Paulo", address_state: "SP", address_line1: "Rua X",
    });
    expect(r.success).toBe(false);
  });
});

describe("partnerPayoutSchema", () => {
  it("aceita PIX", () => {
    expect(partnerPayoutSchema.safeParse({ method: "pix", pix_key: "+5511999998888", pix_key_type: "phone" }).success).toBe(true);
  });
  it("rejeita routing ABA inválido em bank_us", () => {
    expect(partnerPayoutSchema.safeParse({ method: "bank_us", routing_number: "021000020", account_number: "123", account_type: "checking" }).success).toBe(false);
  });
});

describe("prefillProfileSchema", () => {
  const validBrPj = {
    country: "BR", person_type: "company", tax_id: "11.222.333/0001-81",
    company_legal_name: "ACME LTDA", phone: "+556232925602",
    address_postal_code: "01001-000", address_city: "São Paulo",
    address_state: "SP", address_line1: "Praça da Sé", address_number: "1",
    payout_methods: [{ method: "pix", pix_key: "+556232925602", pix_key_type: "phone" }],
  };
  it("aceita prefill BR PJ válido com payout", () => {
    expect(prefillProfileSchema.safeParse(validBrPj).success).toBe(true);
  });
  it("rejeita telefone fora de E.164 (o bug original)", () => {
    expect(prefillProfileSchema.safeParse({ ...validBrPj, phone: "62 3292 5602" }).success).toBe(false);
  });
  it("rejeita payout inválido (PIX sem chave)", () => {
    expect(prefillProfileSchema.safeParse({ ...validBrPj, payout_methods: [{ method: "pix" }] }).success).toBe(false);
  });
  it("aceita prefill sem payout_methods", () => {
    const { payout_methods, ...noPayout } = validBrPj;
    void payout_methods;
    expect(prefillProfileSchema.safeParse(noPayout).success).toBe(true);
  });
});
