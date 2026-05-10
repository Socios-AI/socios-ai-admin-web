import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  requireSuperAdminAAL2: authMock,
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
  authMock.mockReset();
  adminClientMock.mockReset();
});

describe("toggleAppFlagAction", () => {
  it("happy path: super-admin flips active=false with reason", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
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
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
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
    authMock.mockResolvedValue(null);
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
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    const result = await toggleAppFlagAction({
      slug: "x",
      flag: "active",
      value: false,
      reason: "no",
    });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("app not found → NOT_FOUND", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
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
