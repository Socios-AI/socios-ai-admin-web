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

import { cancelSubscriptionAction } from "../../app/_actions/cancel-subscription";

const validInput = {
  subscriptionId: "33333333-3333-3333-3333-333333333333",
  reason: "Cliente solicitou cancelamento",
};

function buildSb(opts: {
  sub?: { user_id: string; status: string; plan_id: string } | null;
  subError?: { message: string } | null;
  updateError?: { message: string } | null;
}) {
  const subSelectSingle = vi.fn().mockResolvedValue({
    data: opts.sub ?? {
      user_id: "11111111-1111-1111-1111-111111111111",
      status: "manual",
      plan_id: "22222222-2222-2222-2222-222222222222",
    },
    error: opts.subError ?? null,
  });
  const subSelectEq = vi.fn(() => ({ single: subSelectSingle }));
  const subSelect = vi.fn(() => ({ eq: subSelectEq }));

  const updateEq = vi.fn().mockResolvedValue({ error: opts.updateError ?? null });
  const subUpdate = vi.fn(() => ({ eq: updateEq }));

  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "subscriptions") return { select: subSelect, update: subUpdate };
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });

  return { from, subSelect, subUpdate, updateEq, auditInsert };
}

beforeEach(() => {
  claimsMock.mockReset();
  adminClientMock.mockReset();
});

describe("cancelSubscriptionAction", () => {
  it("non-super-admin → FORBIDDEN", async () => {
    claimsMock.mockResolvedValue({ super_admin: false });
    const result = await cancelSubscriptionAction(validInput);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("missing reason → VALIDATION", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-1" });
    const result = await cancelSubscriptionAction({
      subscriptionId: validInput.subscriptionId,
      reason: "no",
    });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("subscription not found → NOT_FOUND", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-1" });
    const sb = buildSb({ sub: null, subError: { message: "no rows" } });
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await cancelSubscriptionAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("already canceled → CONFLICT", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-1" });
    const sb = buildSb({
      sub: {
        user_id: "11111111-1111-1111-1111-111111111111",
        status: "canceled",
        plan_id: "22222222-2222-2222-2222-222222222222",
      },
    });
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await cancelSubscriptionAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
  });

  it("expired → CONFLICT", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-1" });
    const sb = buildSb({
      sub: {
        user_id: "11111111-1111-1111-1111-111111111111",
        status: "expired",
        plan_id: "22222222-2222-2222-2222-222222222222",
      },
    });
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await cancelSubscriptionAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
  });

  it("happy path → ok, updates status='canceled' + canceled_at, writes audit, revalidates", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-1" });
    const sb = buildSb({});
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await cancelSubscriptionAction(validInput);
    expect(result).toEqual({ ok: true });

    // Update was called with status + canceled_at, NOT current_period_end
    expect(sb.subUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "canceled",
        canceled_at: expect.any(String),
      }),
    );
    const updatePayload = sb.subUpdate.mock.calls[0][0];
    expect(updatePayload).not.toHaveProperty("current_period_end");

    // Audit
    expect(sb.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "subscription.canceled",
        actor_user_id: "admin-1",
        metadata: expect.objectContaining({
          subscription_id: validInput.subscriptionId,
          reason: validInput.reason,
          user_id: "11111111-1111-1111-1111-111111111111",
          plan_id: "22222222-2222-2222-2222-222222222222",
        }),
      }),
    );

    // Revalidate
    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith("/users/11111111-1111-1111-1111-111111111111");
  });
});
