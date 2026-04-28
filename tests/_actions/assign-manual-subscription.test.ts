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
  // new action chain: .select().eq("plan_id").in("status").eq("user_id").maybeSingle()
  const existingSubEqAfterIn = vi.fn(() => ({ maybeSingle: existingSubMaybeSingle }));
  const existingSubIn = vi.fn(() => ({ eq: existingSubEqAfterIn }));
  const existingSubEq1 = vi.fn(() => ({ in: existingSubIn }));
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
              in: vi.fn(() => ({
                eq: vi.fn(() => ({
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

const SUPER_ADMIN_CLAIMS = {
  sub: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  super_admin: true,
};

const validOrgInput = {
  orgId: "33333333-3333-3333-3333-333333333333",
  appSlug: "case-predictor",
  planId: "22222222-2222-2222-2222-222222222222",
  currentPeriodEnd: "2026-12-31T23:59:59.000Z",
};

const validUserInput = {
  userId: "11111111-1111-1111-1111-111111111111",
  planId: "22222222-2222-2222-2222-222222222222",
  currentPeriodEnd: "2026-12-31T23:59:59.000Z",
};

function buildOrgSb(opts: {
  plan?: { id: string; slug: string; name: string; is_active: boolean } | null;
  planError?: { message: string } | null;
  memberCount?: number;
  existing?: { id: string } | null;
  insertedId?: string;
  insertError?: { message: string } | null;
}) {
  const planSelectSingle = vi.fn().mockResolvedValue({
    data: opts.plan ?? {
      id: "22222222-2222-2222-2222-222222222222",
      slug: "pro",
      name: "Pro",
      is_active: true,
    },
    error: opts.planError ?? null,
  });
  const planSelectEq = vi.fn(() => ({ single: planSelectSingle }));
  const planSelect = vi.fn(() => ({ eq: planSelectEq }));

  const membershipCountResult = { count: opts.memberCount ?? 1, error: null };
  const membershipIs = vi.fn().mockResolvedValue(membershipCountResult);
  const membershipEq2 = vi.fn(() => ({ is: membershipIs }));
  const membershipEq1 = vi.fn(() => ({ eq: membershipEq2 }));
  const membershipSelect = vi.fn(() => ({ eq: membershipEq1 }));

  // new action chain: .select().eq("plan_id").in("status").eq("org_id").maybeSingle()
  const dupMaybeSingle = vi.fn().mockResolvedValue({
    data: opts.existing ?? null,
    error: null,
  });
  const dupEqAfterIn = vi.fn(() => ({ maybeSingle: dupMaybeSingle }));
  const dupIn = vi.fn(() => ({ eq: dupEqAfterIn }));
  const dupEq1 = vi.fn(() => ({ in: dupIn }));
  const dupSelect = vi.fn(() => ({ eq: dupEq1 }));

  const insertSingle = vi.fn().mockResolvedValue({
    data: opts.insertedId ? { id: opts.insertedId } : { id: "55555555-5555-5555-5555-555555555555" },
    error: opts.insertError ?? null,
  });
  const insertSelect = vi.fn(() => ({ single: insertSingle }));
  const subInsert = vi.fn(() => ({ select: insertSelect }));

  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "plans") return { select: planSelect };
    if (table === "app_memberships") return { select: membershipSelect };
    if (table === "subscriptions") {
      return { select: dupSelect, insert: subInsert };
    }
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });

  return { from, auditInsert, subInsert };
}

describe("assignManualSubscriptionAction · org branch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claimsMock.mockResolvedValue(SUPER_ADMIN_CLAIMS);
  });

  it("returns FORBIDDEN when caller is not super_admin", async () => {
    claimsMock.mockResolvedValue({ sub: "x", super_admin: false });
    const res = await assignManualSubscriptionAction(validOrgInput);
    expect(res).toEqual({ ok: false, error: "FORBIDDEN" });
  });

  it("returns NOT_FOUND when org has zero active members in app", async () => {
    const sb = buildOrgSb({ memberCount: 0 });
    adminClientMock.mockReturnValue({ from: sb.from });
    const res = await assignManualSubscriptionAction(validOrgInput);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("NOT_FOUND");
      expect(res.message).toMatch(/membros ativos/i);
    }
  });

  it("returns CONFLICT when org already has active sub for plan", async () => {
    const sb = buildOrgSb({
      memberCount: 2,
      existing: { id: "66666666-6666-6666-6666-666666666666" },
    });
    adminClientMock.mockReturnValue({ from: sb.from });
    const res = await assignManualSubscriptionAction(validOrgInput);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("CONFLICT");
  });

  it("inserts org sub with correct payload and audit metadata on happy path", async () => {
    const sb = buildOrgSb({ memberCount: 3 });
    adminClientMock.mockReturnValue({ from: sb.from });

    const res = await assignManualSubscriptionAction(validOrgInput);

    expect(res).toEqual({
      ok: true,
      subscriptionId: "55555555-5555-5555-5555-555555555555",
    });

    expect(sb.subInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: validOrgInput.orgId,
        user_id: null,
        plan_id: validOrgInput.planId,
        status: "manual",
        current_period_end: validOrgInput.currentPeriodEnd,
      }),
    );

    const auditCall = sb.auditInsert.mock.calls[0]?.[0];
    expect(auditCall).toMatchObject({
      event_type: "subscription.assigned_manually",
      metadata: expect.objectContaining({
        subject_type: "org",
        subject_id: validOrgInput.orgId,
        org_id: validOrgInput.orgId,
        app_slug: validOrgInput.appSlug,
        plan_id: validOrgInput.planId,
      }),
    });
    expect(auditCall.metadata.user_id).toBeUndefined();

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(`/orgs/${validOrgInput.orgId}`);
  });
});

describe("assignManualSubscriptionAction · user branch (regression)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claimsMock.mockResolvedValue(SUPER_ADMIN_CLAIMS);
  });

  it("inserts user sub with subject_type=user metadata", async () => {
    const sb = buildSb({});
    adminClientMock.mockReturnValue({ from: sb.from });

    const res = await assignManualSubscriptionAction(validUserInput);

    expect(res.ok).toBe(true);
    const auditCall = sb.auditInsert.mock.calls[0]?.[0];
    expect(auditCall.metadata).toMatchObject({
      subject_type: "user",
      subject_id: "11111111-1111-1111-1111-111111111111",
      user_id: "11111111-1111-1111-1111-111111111111",
    });
    expect(auditCall.metadata.org_id).toBeUndefined();
  });
});
