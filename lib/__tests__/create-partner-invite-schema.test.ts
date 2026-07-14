import { describe, it, expect } from "vitest";
import { createPartnerInviteSchema } from "../validation";

describe("createPartnerInviteSchema", () => {
  const base = { email: "a@b.com", fullName: "Fulano", targetRole: "representante" as const };
  it("aceita payload válido sem upline", () => {
    expect(createPartnerInviteSchema.safeParse(base).success).toBe(true);
  });
  it("aceita os três papéis (licenciado exige dados do contrato · trava F3)", () => {
    for (const targetRole of ["representante", "embaixador"]) {
      expect(createPartnerInviteSchema.safeParse({ ...base, targetRole }).success).toBe(true);
    }
    expect(createPartnerInviteSchema.safeParse({ ...base, targetRole: "licenciado" }).success).toBe(false);
    expect(
      createPartnerInviteSchema.safeParse({
        ...base,
        targetRole: "licenciado",
        contractProfile: { country: "BR", person_type: "company", company_legal_name: "X LTDA" },
      }).success,
    ).toBe(true);
  });
  it("rejeita papel inválido (afiliado)", () => {
    expect(createPartnerInviteSchema.safeParse({ ...base, targetRole: "afiliado" }).success).toBe(false);
  });
  it("aceita upline uuid e rejeita upline não-uuid", () => {
    expect(createPartnerInviteSchema.safeParse({ ...base, introducedByPartnerId: "b0000000-0000-0000-0000-000000000002" }).success).toBe(true);
    expect(createPartnerInviteSchema.safeParse({ ...base, introducedByPartnerId: "nope" }).success).toBe(false);
  });
  it("aceita commissionPct em [0,1] e rejeita fora do intervalo", () => {
    expect(createPartnerInviteSchema.safeParse({ ...base, commissionPct: 0.25 }).success).toBe(true);
    expect(createPartnerInviteSchema.safeParse({ ...base, commissionPct: 0 }).success).toBe(true);
    expect(createPartnerInviteSchema.safeParse({ ...base, commissionPct: 1 }).success).toBe(true);
    expect(createPartnerInviteSchema.safeParse({ ...base, commissionPct: 1.5 }).success).toBe(false);
    expect(createPartnerInviteSchema.safeParse({ ...base, commissionPct: -0.1 }).success).toBe(false);
  });
});
