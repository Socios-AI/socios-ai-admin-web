import { describe, it, expect } from "vitest";
import { createPartnerInviteSchema } from "../../lib/validation";

const baseValid = { email: "a@b.com", fullName: "Ana Silva", targetRole: "licenciado" as const };

describe("createPartnerInviteSchema · contrato", () => {
  it("aceita convite sem bloco de contrato (retrocompatível)", () => {
    expect(createPartnerInviteSchema.safeParse(baseValid).success).toBe(true);
  });

  it("aceita bloco de contrato válido para licenciado", () => {
    const r = createPartnerInviteSchema.safeParse({
      ...baseValid,
      licenseAmountUsd: 15000,
      territory: "Non-exclusive, no territorial restriction",
      contractProfile: { country: "BR", person_type: "company", tax_id: "11444777000161", company_legal_name: "X LTDA" },
    });
    expect(r.success).toBe(true);
  });

  it("rejeita licenseAmountUsd negativo", () => {
    const r = createPartnerInviteSchema.safeParse({ ...baseValid, licenseAmountUsd: -1 });
    expect(r.success).toBe(false);
  });
});
