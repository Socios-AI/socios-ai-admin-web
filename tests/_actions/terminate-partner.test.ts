import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { terminatePartnerAction } from "../../app/_actions/terminate-partner";

function buildSb(currentStatus: string | null) {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: vi.fn(() => ({ eq: updateEq })) }));
  const maybeSingle = vi.fn().mockResolvedValue(
    currentStatus === null
      ? { data: null, error: null }
      : { data: { status: currentStatus }, error: null },
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

describe("terminatePartnerAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    adminClientMock.mockReset();
  });

  const valid = {
    partnerId: "22222222-2222-2222-2222-222222222222",
    reason: "Encerramento solicitado pelo licenciado",
  };

  it("forbidden for non-super-admin", async () => {
    authMock.mockResolvedValue(null);
    const r = await terminatePartnerAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("validation error", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    const r = await terminatePartnerAction({ partnerId: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("not found", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    adminClientMock.mockReturnValue(buildSb(null));
    const r = await terminatePartnerAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("NOT_FOUND");
  });

  it("cannot terminate an already terminated partner", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    adminClientMock.mockReturnValue(buildSb("terminated"));
    const r = await terminatePartnerAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("INVALID_STATE");
  });

  it("terminates an active partner", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    adminClientMock.mockReturnValue(buildSb("active"));
    const r = await terminatePartnerAction(valid);
    expect(r.ok).toBe(true);
  });
});
