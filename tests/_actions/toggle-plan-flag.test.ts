import { describe, it, expect, vi, beforeEach } from "vitest";

const { claimsMock, adminClientMock, archiveMock } = vi.hoisted(() => ({
  claimsMock: vi.fn(),
  adminClientMock: vi.fn(),
  archiveMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerClaims: claimsMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getSupabaseAdminClient: adminClientMock,
}));

vi.mock("../../lib/stripe-sync", () => ({
  archiveStripeProduct: archiveMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { togglePlanFlagAction } from "../../app/_actions/toggle-plan-flag";

type Existing = {
  id: string;
  slug: string;
  is_active: boolean;
  is_visible: boolean;
  stripe_product_id: string | null;
};

function buildSb(existing: Existing | null) {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn(() => ({ eq: updateEq }));
  const selectEq = vi.fn(() => ({
    maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
  }));
  const selectMock = vi.fn(() => ({ eq: selectEq }));
  const fromMock = vi.fn((table: string) => {
    if (table === "plans") return { select: selectMock, update: updateMock };
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });
  return { fromMock, auditInsert, updateMock };
}

beforeEach(() => {
  claimsMock.mockReset();
  adminClientMock.mockReset();
  archiveMock.mockReset();
  archiveMock.mockResolvedValue({ mocked: true });
});

describe("togglePlanFlagAction", () => {
  const EXISTING: Existing = {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "pro",
    is_active: true,
    is_visible: true,
    stripe_product_id: "prod_mock_pro",
  };

  it("deactivating is_active archives stripe product and audits plan.deactivated", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const harness = buildSb(EXISTING);
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await togglePlanFlagAction({
      id: "00000000-0000-0000-0000-000000000001",
      flag: "is_active",
      value: false,
      reason: "Sunset oficial",
    });

    expect(result).toEqual({ ok: true });
    expect(archiveMock).toHaveBeenCalledWith("prod_mock_pro");
    expect(harness.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "plan.deactivated" }),
    );
  });

  it("toggling is_visible does not archive product", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const harness = buildSb(EXISTING);
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    await togglePlanFlagAction({
      id: "00000000-0000-0000-0000-000000000001",
      flag: "is_visible",
      value: false,
      reason: "Tornando invite-only",
    });

    expect(archiveMock).not.toHaveBeenCalled();
    expect(harness.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "plan.updated" }),
    );
  });

  it("activating again uses plan.created event (re-activation)", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const harness = buildSb({ ...EXISTING, is_active: false });
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    await togglePlanFlagAction({
      id: "00000000-0000-0000-0000-000000000001",
      flag: "is_active",
      value: true,
      reason: "Trazendo de volta",
    });

    expect(archiveMock).not.toHaveBeenCalled();
    expect(harness.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "plan.created" }),
    );
  });

  it("non-super-admin → FORBIDDEN", async () => {
    claimsMock.mockResolvedValue({ super_admin: false, sub: "u-1" });
    const result = await togglePlanFlagAction({
      id: "00000000-0000-0000-0000-000000000001",
      flag: "is_active",
      value: false,
      reason: "whatever",
    });
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("reason too short → VALIDATION", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const result = await togglePlanFlagAction({
      id: "00000000-0000-0000-0000-000000000001",
      flag: "is_active",
      value: false,
      reason: "no",
    });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("plan not found → NOT_FOUND", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const harness = buildSb(null);
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await togglePlanFlagAction({
      id: "00000000-0000-0000-0000-000000000001",
      flag: "is_active",
      value: false,
      reason: "missing plan",
    });
    expect(result).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("stripe archive failure does not roll back DB but logs error in audit metadata", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    archiveMock.mockRejectedValue(new Error("Stripe 500"));
    const harness = buildSb(EXISTING);
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await togglePlanFlagAction({
      id: "00000000-0000-0000-0000-000000000001",
      flag: "is_active",
      value: false,
      reason: "Sunset",
    });

    expect(result).toEqual({ ok: true });
    const auditCall = harness.auditInsert.mock.calls[0]?.[0];
    expect(auditCall.metadata).toMatchObject({ stripe_archive_error: "Stripe 500" });
  });
});
