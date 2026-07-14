import { describe, it, expect } from "vitest";
import { createPartnerInviteSchema } from "../../lib/validation";

const baseValid = { email: "a@b.com", fullName: "Ana Silva", targetRole: "licenciado" as const };

describe("createPartnerInviteSchema · contrato", () => {
  it("licenciado SEM dados de contrato é rejeitado (F3)", () => {
    const r = createPartnerInviteSchema.safeParse(baseValid);
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues[0]?.message).toContain("dados do contrato");
  });

  it("representante/embaixador sem contrato seguem aceitos", () => {
    expect(createPartnerInviteSchema.safeParse({ ...baseValid, targetRole: "representante" }).success).toBe(true);
    expect(createPartnerInviteSchema.safeParse({ ...baseValid, targetRole: "embaixador" }).success).toBe(true);
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
