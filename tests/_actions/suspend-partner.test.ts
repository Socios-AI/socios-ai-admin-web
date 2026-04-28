import { describe, it, expect, vi, beforeEach } from "vitest";

const { claimsMock, adminClientMock } = vi.hoisted(() => ({
  claimsMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ getCallerClaims: claimsMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { suspendPartnerAction } from "../../app/_actions/suspend-partner";

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

describe("suspendPartnerAction", () => {
  beforeEach(() => {
    claimsMock.mockReset();
    adminClientMock.mockReset();
  });

  const valid = {
    partnerId: "22222222-2222-2222-2222-222222222222",
    reason: "Inatividade prolongada",
  };

  it("forbidden for non-super-admin", async () => {
    claimsMock.mockResolvedValue({ sub: "u", super_admin: false });
    const r = await suspendPartnerAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("validation error", async () => {
    claimsMock.mockResolvedValue({ sub: "u", super_admin: true });
    const r = await suspendPartnerAction({ partnerId: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("not found", async () => {
    claimsMock.mockResolvedValue({ sub: "u", super_admin: true });
    adminClientMock.mockReturnValue(buildSb(null));
    const r = await suspendPartnerAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("NOT_FOUND");
  });

  it("cannot suspend a terminated partner", async () => {
    claimsMock.mockResolvedValue({ sub: "u", super_admin: true });
    adminClientMock.mockReturnValue(buildSb("terminated"));
    const r = await suspendPartnerAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("INVALID_STATE");
  });

  it("suspends an active partner", async () => {
    claimsMock.mockResolvedValue({ sub: "u", super_admin: true });
    adminClientMock.mockReturnValue(buildSb("active"));
    const r = await suspendPartnerAction(valid);
    expect(r.ok).toBe(true);
  });
});
