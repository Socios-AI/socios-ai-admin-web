import { describe, it, expect } from "vitest";
import { createPartnerInviteSchema } from "../validation";

describe("createPartnerInviteSchema", () => {
  const base = { email: "a@b.com", fullName: "Fulano", targetRole: "representante" as const };
  it("aceita payload válido sem upline", () => {
    expect(createPartnerInviteSchema.safeParse(base).success).toBe(true);
  });
  it("aceita os três papéis", () => {
    for (const targetRole of ["licenciado", "representante", "embaixador"]) {
      expect(createPartnerInviteSchema.safeParse({ ...base, targetRole }).success).toBe(true);
    }
  });
  it("rejeita papel inválido (afiliado)", () => {
    expect(createPartnerInviteSchema.safeParse({ ...base, targetRole: "afiliado" }).success).toBe(false);
  });
  it("aceita upline uuid e rejeita upline não-uuid", () => {
    expect(createPartnerInviteSchema.safeParse({ ...base, introducedByPartnerId: "b0000000-0000-0000-0000-000000000002" }).success).toBe(true);
    expect(createPartnerInviteSchema.safeParse({ ...base, introducedByPartnerId: "nope" }).success).toBe(false);
  });
});
