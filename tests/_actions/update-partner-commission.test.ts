import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updatePartnerCommissionAction } from "../../app/_actions/update-partner-commission";

function buildSb(currentPct: number | null | "missing") {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: updateEq }));
  const maybeSingle = vi.fn().mockResolvedValue(
    currentPct === "missing"
      ? { data: null, error: null }
      : { data: { custom_commission_pct: currentPct }, error: null },
  );
  const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));
  const audit = vi.fn().mockResolvedValue({ error: null });
  return {
    from: vi.fn((table: string) => {
      if (table === "audit_log") return { insert: audit };
      return { select, update };
    }),
  };
}

describe("updatePartnerCommissionAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    adminClientMock.mockReset();
  });

  const validSet = {
    partnerId: "22222222-2222-2222-2222-222222222222",
    customCommissionPct: 0.6,
    reason: "Negociação especial",
  };
  const validClear = {
    partnerId: "22222222-2222-2222-2222-222222222222",
    customCommissionPct: null,
    reason: "Voltar ao padrão",
  };

  it("forbidden for non-super-admin", async () => {
    authMock.mockResolvedValue(null);
    const r = await updatePartnerCommissionAction(validSet);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("validation error", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    const r = await updatePartnerCommissionAction({ partnerId: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("not found", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    adminClientMock.mockReturnValue(buildSb("missing"));
    const r = await updatePartnerCommissionAction(validSet);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("NOT_FOUND");
  });

  it("sets a numeric commission", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    adminClientMock.mockReturnValue(buildSb(0.5));
    const r = await updatePartnerCommissionAction(validSet);
    expect(r.ok).toBe(true);
  });

  it("clears the commission with null", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    adminClientMock.mockReturnValue(buildSb(0.5));
    const r = await updatePartnerCommissionAction(validClear);
    expect(r.ok).toBe(true);
  });
});
