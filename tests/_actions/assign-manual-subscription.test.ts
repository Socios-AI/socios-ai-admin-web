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

import { assignManualSubscriptionAction } from "../../app/_actions/assign-manual-subscription";

const validInput = {
  userId: "11111111-1111-1111-1111-111111111111",
  planId: "22222222-2222-2222-2222-222222222222",
  currentPeriodEnd: "2026-05-25T00:00:00Z",
};

type Harness = {
  from: ReturnType<typeof vi.fn>;
  planSelectSingle: ReturnType<typeof vi.fn>;
  existingSubMaybeSingle: ReturnType<typeof vi.fn>;
  subInsertSingle: ReturnType<typeof vi.fn>;
  auditInsert: ReturnType<typeof vi.fn>;
};

function buildSb(opts: {
  plan?: { id: string; slug: string; name: string; is_active: boolean } | null;
  planError?: { message: string } | null;
  existingSub?: { id: string } | null;
  subInsertResult?: { data: { id: string } | null; error: { code?: string; message: string } | null };
}): Harness {
  const planSelectSingle = vi.fn().mockResolvedValue({
    data: opts.plan ?? { id: validInput.planId, slug: "case-pro", name: "Case Pro", is_active: true },
    error: opts.planError ?? null,
  });
  const planSelectEq = vi.fn(() => ({ single: planSelectSingle }));
  const planSelect = vi.fn(() => ({ eq: planSelectEq }));

  const existingSubMaybeSingle = vi.fn().mockResolvedValue({
    data: opts.existingSub ?? null,
    error: null,
  });
  const existingSubIn = vi.fn(() => ({ maybeSingle: existingSubMaybeSingle }));
  const existingSubEq2 = vi.fn(() => ({ in: existingSubIn }));
  const existingSubEq1 = vi.fn(() => ({ eq: existingSubEq2 }));
  const existingSubSelect = vi.fn(() => ({ eq: existingSubEq1 }));

  const subInsertSingle = vi.fn().mockResolvedValue(
    opts.subInsertResult ?? { data: { id: "new-sub-id" }, error: null },
  );
  const subInsertSelect = vi.fn(() => ({ single: subInsertSingle }));
  const subInsert = vi.fn(() => ({ select: subInsertSelect }));

  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "plans") return { select: planSelect };
    if (table === "subscriptions") {
      // first call is the existence check (select), second is insert
      return { select: existingSubSelect, insert: subInsert };
    }
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });

  return { from, planSelectSingle, existingSubMaybeSingle, subInsertSingle, auditInsert };
}

beforeEach(() => {
  claimsMock.mockReset();
  adminClientMock.mockReset();
});

describe("assignManualSubscriptionAction", () => {
  it("non-super-admin → FORBIDDEN", async () => {
    claimsMock.mockResolvedValue({ super_admin: false });
    const result = await assignManualSubscriptionAction(validInput);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("invalid planId → VALIDATION", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    const result = await assignManualSubscriptionAction({
      ...validInput,
      planId: "not-a-uuid",
    });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("plan not found or inactive → NOT_FOUND", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-1" });
    const sb = buildSb({ plan: null, planError: { message: "no rows" } });
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await assignManualSubscriptionAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("plan is_active=false → NOT_FOUND with helpful message", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-1" });
    const sb = buildSb({
      plan: { id: validInput.planId, slug: "case-pro", name: "Case Pro", is_active: false },
    });
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await assignManualSubscriptionAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
    if (!result.ok) expect(result.message).toMatch(/desativado/i);
  });

  it("duplicate active subscription → CONFLICT", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-1" });
    const sb = buildSb({
      existingSub: { id: "existing-sub-id" },
    });
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await assignManualSubscriptionAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
  });

  it("happy path → ok with subscriptionId, inserts subscription + audit", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-1" });
    const sb = buildSb({});
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await assignManualSubscriptionAction({
      ...validInput,
      notes: "Cortesia de 1 mês",
    });

    expect(result).toEqual({ ok: true, subscriptionId: "new-sub-id" });
    expect(sb.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "subscription.assigned_manually",
        actor_user_id: "admin-1",
        metadata: expect.objectContaining({
          plan_id: validInput.planId,
          plan_slug: "case-pro",
          user_id: validInput.userId,
          current_period_end: validInput.currentPeriodEnd,
          notes: "Cortesia de 1 mês",
        }),
      }),
    );
  });

  it("inserts subscription with status='manual', external_ref=null, created_by=adminId, notes in metadata", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-7" });
    const sb = buildSb({});
    const subInsertCapture = vi.fn().mockResolvedValue({ data: { id: "new-sub-id" }, error: null });
    const subInsertSelect = vi.fn(() => ({ single: subInsertCapture }));
    const insertSpy = vi.fn(() => ({ select: subInsertSelect }));

    sb.from.mockImplementation((table: string) => {
      if (table === "plans") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: validInput.planId, slug: "case-pro", name: "Case Pro", is_active: true },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "subscriptions") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          })),
          insert: insertSpy,
        };
      }
      if (table === "audit_log") return { insert: vi.fn().mockResolvedValue({ error: null }) };
      throw new Error(`unexpected table ${table}`);
    });
    adminClientMock.mockReturnValue({ from: sb.from });

    await assignManualSubscriptionAction({
      ...validInput,
      notes: "abc",
    });

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: validInput.userId,
        plan_id: validInput.planId,
        status: "manual",
        external_ref: null,
        created_by: "admin-7",
        current_period_end: validInput.currentPeriodEnd,
        metadata: { notes: "abc" },
      }),
    );
  });

  it("calls revalidatePath with /users/{userId}", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "admin-1" });
    const sb = buildSb({});
    adminClientMock.mockReturnValue({ from: sb.from });

    const { revalidatePath } = await import("next/cache");
    await assignManualSubscriptionAction(validInput);

    expect(revalidatePath).toHaveBeenCalledWith(`/users/${validInput.userId}`);
  });
});
