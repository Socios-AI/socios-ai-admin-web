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

import { cancelSubscriptionAction } from "../../app/_actions/cancel-subscription";
import { revalidatePath } from "next/cache";

const validInput = {
  subscriptionId: "33333333-3333-3333-3333-333333333333",
  reason: "Cliente solicitou cancelamento",
};

const SUPER_ADMIN_CLAIMS = { claims: { sub: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" };

function buildSb(opts: {
  sub?: { user_id: string | null; org_id?: string | null; status: string; plan_id: string } | null;
  subError?: { message: string } | null;
  updateError?: { message: string } | null;
  plan?: { slug: string; name: string } | null;
}) {
  const subSelectSingle = vi.fn().mockResolvedValue({
    data: opts.sub ?? {
      user_id: "11111111-1111-1111-1111-111111111111",
      org_id: null,
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

  const planSelectSingle = vi.fn().mockResolvedValue({
    data: opts.plan ?? {
      slug: "case-pro",
      name: "Case Pro",
    },
    error: null,
  });
  const planSelectEq = vi.fn(() => ({ single: planSelectSingle }));
  const planSelect = vi.fn(() => ({ eq: planSelectEq }));

  const from = vi.fn((table: string) => {
    if (table === "subscriptions") return { select: subSelect, update: subUpdate };
    if (table === "plans") return { select: planSelect };
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });

  return { from, subSelect, subUpdate, updateEq, auditInsert, planSelect, planSelectEq };
}

beforeEach(() => {
  authMock.mockReset();
  adminClientMock.mockReset();
});

describe("cancelSubscriptionAction", () => {
  it("non-super-admin → FORBIDDEN", async () => {
    authMock.mockResolvedValue(null);
    const result = await cancelSubscriptionAction(validInput);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("missing reason → VALIDATION", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    const result = await cancelSubscriptionAction({
      subscriptionId: validInput.subscriptionId,
      reason: "no",
    });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("subscription not found → NOT_FOUND", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    const sb = buildSb({ sub: null, subError: { message: "no rows" } });
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await cancelSubscriptionAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("already canceled → CONFLICT", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
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
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
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
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
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
    const updatePayload = (sb.subUpdate.mock.calls[0] as unknown as unknown[])[0];
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
          plan_slug: "case-pro",
          plan_name: "Case Pro",
        }),
      }),
    );

    const auditCall = sb.auditInsert.mock.calls[0]?.[0];
    expect(auditCall.metadata).toMatchObject({
      subject_type: "user",
      subject_id: "11111111-1111-1111-1111-111111111111",
      user_id: "11111111-1111-1111-1111-111111111111",
    });
    expect(auditCall.metadata.org_id).toBeUndefined();

    // Revalidate
    expect(revalidatePath).toHaveBeenCalledWith("/users/11111111-1111-1111-1111-111111111111");
  });
});

describe("cancelSubscriptionAction · org branch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(SUPER_ADMIN_CLAIMS);
  });

  it("cancels org sub and writes subject_type=org metadata", async () => {
    const sb = buildSb({
      sub: {
        user_id: null,
        org_id: "33333333-3333-3333-3333-333333333333",
        status: "manual",
        plan_id: "22222222-2222-2222-2222-222222222222",
      },
      plan: {
        slug: "team",
        name: "Team",
      },
    });
    adminClientMock.mockReturnValue({ from: sb.from });

    const res = await cancelSubscriptionAction({
      subscriptionId: "44444444-4444-4444-4444-444444444444",
      reason: "Plano org cancelado a pedido do tenant-admin",
    });

    expect(res).toEqual({ ok: true });
    const auditCall = sb.auditInsert.mock.calls[0]?.[0];
    expect(auditCall.metadata).toMatchObject({
      subject_type: "org",
      subject_id: "33333333-3333-3333-3333-333333333333",
      org_id: "33333333-3333-3333-3333-333333333333",
      plan_slug: "team",
      plan_name: "Team",
    });
    expect(auditCall.metadata.user_id).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith(
      "/orgs/33333333-3333-3333-3333-333333333333",
    );
  });
});
