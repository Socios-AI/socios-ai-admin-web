import { describe, it, expect, vi, beforeEach } from "vitest";

const { claimsMock, adminClientMock } = vi.hoisted(() => ({
  claimsMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerClaims: claimsMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getSupabaseAdminClient: adminClientMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { toggleAppFlagAction } from "../../app/_actions/toggle-app-flag";

type AppRow = { slug: string; active: boolean; accepts_new_subscriptions: boolean } | null;

function buildSupabase(existing: AppRow, updateError: { message: string } | null = null) {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
  const updateMock = vi.fn(() => ({ eq: updateEq }));
  const selectEq = vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }) }));
  const selectMock = vi.fn(() => ({ eq: selectEq }));

  const fromMock = vi.fn((table: string) => {
    if (table === "audit_log") return { insert: auditInsert };
    if (table === "apps") return { select: selectMock, update: updateMock };
    throw new Error(`unexpected table ${table}`);
  });

  return { fromMock, auditInsert, updateMock, updateEq };
}

beforeEach(() => {
  claimsMock.mockReset();
  adminClientMock.mockReset();
});

describe("toggleAppFlagAction", () => {
  it("happy path: super-admin flips active=false with reason", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const harness = buildSupabase({ slug: "case-pred", active: true, accepts_new_subscriptions: true });
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await toggleAppFlagAction({
      slug: "case-pred",
      flag: "active",
      value: false,
      reason: "Sunset oficial",
    });

    expect(result).toEqual({ ok: true });
    expect(harness.updateMock).toHaveBeenCalledWith({ active: false });
    expect(harness.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "app.deactivated", app_slug: "case-pred" }),
    );
  });

  it("toggle accepts_new_subscriptions=false uses subscriptions_closed event", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const harness = buildSupabase({ slug: "case-pred", active: true, accepts_new_subscriptions: true });
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    await toggleAppFlagAction({
      slug: "case-pred",
      flag: "accepts_new_subscriptions",
      value: false,
      reason: "Pausando vendas novas para revisar precificação",
    });

    expect(harness.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "app.subscriptions_closed" }),
    );
  });

  it("non-super-admin → FORBIDDEN", async () => {
    claimsMock.mockResolvedValue({ super_admin: false, sub: "u-1" });
    const result = await toggleAppFlagAction({
      slug: "x",
      flag: "active",
      value: false,
      reason: "Reason here",
    });
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("reason too short → VALIDATION", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const result = await toggleAppFlagAction({
      slug: "x",
      flag: "active",
      value: false,
      reason: "no",
    });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("app not found → NOT_FOUND", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const harness = buildSupabase(null);
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await toggleAppFlagAction({
      slug: "missing",
      flag: "active",
      value: false,
      reason: "Reason here",
    });
    expect(result).toEqual({ ok: false, error: "NOT_FOUND" });
  });
});
