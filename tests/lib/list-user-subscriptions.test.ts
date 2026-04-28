import { describe, it, expect, vi, beforeEach } from "vitest";

const { callerClientMock } = vi.hoisted(() => ({
  callerClientMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: callerClientMock,
}));

import { listUserSubscriptions } from "../../lib/data";

beforeEach(() => {
  callerClientMock.mockReset();
});

// Builds a mock supabase client that handles three sequential queries:
//   1. from("subscriptions") .select().eq().order()   -> userSubsResult
//   2. from("app_memberships") .select().eq().is().not()  -> membershipsResult
//   3. from("subscriptions") .select().in().order()   -> orgSubsResult (optional)
function buildMultiSb(
  userSubsResult: { data: unknown[] | null; error: { message: string } | null },
  membershipsResult: { data: unknown[] | null; error: { message: string } | null },
  orgSubsResult: { data: unknown[] | null; error: { message: string } | null } = { data: [], error: null },
) {
  // Query 1: subscriptions by user_id — chain: select -> eq -> order
  const userOrder = vi.fn().mockResolvedValue(userSubsResult);
  const userEq = vi.fn(() => ({ order: userOrder }));
  const userSelect = vi.fn(() => ({ eq: userEq }));

  // Query 2: app_memberships — chain: select -> eq -> is -> not
  const memNot = vi.fn().mockResolvedValue(membershipsResult);
  const memIs = vi.fn(() => ({ not: memNot }));
  const memEq = vi.fn(() => ({ is: memIs }));
  const memSelect = vi.fn(() => ({ eq: memEq }));

  // Query 3: subscriptions by org_id — chain: select -> in -> order
  const orgOrder = vi.fn().mockResolvedValue(orgSubsResult);
  const orgIn = vi.fn(() => ({ order: orgOrder }));
  const orgSelect = vi.fn(() => ({ in: orgIn }));

  let callCount = 0;
  const from = vi.fn((table: string) => {
    callCount++;
    if (callCount === 1 && table === "subscriptions") return { select: userSelect };
    if (callCount === 2 && table === "app_memberships") return { select: memSelect };
    if (callCount === 3 && table === "subscriptions") return { select: orgSelect };
    // Fallback for unexpected calls
    const noop = vi.fn().mockResolvedValue({ data: [], error: null });
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: noop, is: vi.fn(() => ({ not: noop })) })), in: vi.fn(() => ({ order: noop })) })) };
  });

  return { from, userOrder, userEq, userSelect, memNot, memIs, memEq, memSelect, orgOrder, orgIn, orgSelect };
}

// Convenience wrapper: user-direct subs only (no org memberships). Equivalent to old buildSb.
function buildSbUserOnly(rows: unknown[] | null, error: { message: string } | null = null) {
  return buildMultiSb(
    { data: rows, error },
    { data: [], error: null },
    { data: [], error: null },
  );
}

describe("listUserSubscriptions", () => {
  it("returns mapped rows ordered by created_at desc", async () => {
    const sbHarness = buildSbUserOnly([
      {
        id: "sub-1",
        status: "manual",
        started_at: "2026-04-25T00:00:00Z",
        current_period_end: "2026-05-25T00:00:00Z",
        canceled_at: null,
        external_ref: null,
        metadata: { notes: "Cortesia" },
        plans: {
          id: "plan-1",
          slug: "case-pro",
          name: "Case Pro",
          billing_period: "monthly",
          price_amount: 9900,
          currency: "brl",
          plan_apps: [{ app_slug: "case-predictor" }],
        },
      },
    ]);
    callerClientMock.mockReturnValue({ from: sbHarness.from });

    const result = await listUserSubscriptions({
      callerJwt: "jwt-1",
      userId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result).toEqual([
      {
        id: "sub-1",
        status: "manual",
        started_at: "2026-04-25T00:00:00Z",
        current_period_end: "2026-05-25T00:00:00Z",
        canceled_at: null,
        external_ref: null,
        notes: "Cortesia",
        plan: {
          id: "plan-1",
          slug: "case-pro",
          name: "Case Pro",
          billing_period: "monthly",
          price_amount: 9900,
          currency: "brl",
          app_slugs: ["case-predictor"],
        },
        via: "user",
        via_org_id: null,
        via_app_slug: null,
      },
    ]);
    expect(sbHarness.from).toHaveBeenCalledWith("subscriptions");
    expect(sbHarness.userEq).toHaveBeenCalledWith("user_id", "11111111-1111-1111-1111-111111111111");
  });

  it("returns empty array when user has no subscriptions", async () => {
    const sbHarness = buildSbUserOnly([]);
    callerClientMock.mockReturnValue({ from: sbHarness.from });

    const result = await listUserSubscriptions({
      callerJwt: "jwt-1",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result).toEqual([]);
  });

  it("handles missing notes (no metadata.notes)", async () => {
    const sbHarness = buildSbUserOnly([
      {
        id: "sub-2",
        status: "active",
        started_at: "2026-04-01T00:00:00Z",
        current_period_end: null,
        canceled_at: null,
        external_ref: "stripe_sub_xyz",
        metadata: {},
        plans: {
          id: "plan-2",
          slug: "lifetime",
          name: "Lifetime",
          billing_period: "one_time",
          price_amount: 49900,
          currency: "usd",
          plan_apps: [],
        },
      },
    ]);
    callerClientMock.mockReturnValue({ from: sbHarness.from });

    const result = await listUserSubscriptions({
      callerJwt: "jwt-1",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result[0].notes).toBeNull();
    expect(result[0].plan.app_slugs).toEqual([]);
  });

  it("throws when supabase returns error", async () => {
    const sbHarness = buildSbUserOnly(null, { message: "RLS denied" });
    callerClientMock.mockReturnValue({ from: sbHarness.from });

    await expect(
      listUserSubscriptions({
        callerJwt: "jwt-1",
        userId: "11111111-1111-1111-1111-111111111111",
      }),
    ).rejects.toThrow(/RLS denied/);
  });
});

// ---------------------------------------------------------------------------
// via-org coverage
// ---------------------------------------------------------------------------

const userSubFixture = {
  id: "sub-user-1",
  status: "manual",
  started_at: "2026-04-01T00:00:00.000Z",
  current_period_end: null,
  canceled_at: null,
  external_ref: null,
  metadata: {},
  plans: {
    id: "plan-pro",
    slug: "pro",
    name: "Pro",
    billing_period: "monthly",
    price_amount: 10000,
    currency: "BRL",
    plan_apps: [{ app_slug: "case-predictor" }],
  },
};

const orgSubFixture = {
  id: "sub-org-1",
  org_id: "org-A",
  status: "active",
  started_at: "2026-03-01T00:00:00.000Z",
  current_period_end: "2026-12-31T00:00:00.000Z",
  canceled_at: null,
  external_ref: null,
  metadata: {},
  plans: {
    id: "plan-team",
    slug: "team",
    name: "Team",
    billing_period: "yearly",
    price_amount: 50000,
    currency: "BRL",
    plan_apps: [{ app_slug: "case-predictor" }],
  },
};

describe("listUserSubscriptions · via-org coverage", () => {
  it("includes subs that cover the user via active org membership", async () => {
    const sbHarness = buildMultiSb(
      { data: [userSubFixture], error: null },
      { data: [{ org_id: "org-A", app_slug: "case-predictor" }], error: null },
      { data: [orgSubFixture], error: null },
    );
    callerClientMock.mockReturnValue({ from: sbHarness.from });

    const result = await listUserSubscriptions({
      callerJwt: "jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result).toHaveLength(2);
    const userRow = result.find((r) => r.id === "sub-user-1");
    const orgRow = result.find((r) => r.id === "sub-org-1");
    expect(userRow?.via).toBe("user");
    expect(userRow?.via_org_id).toBeNull();
    expect(orgRow?.via).toBe("org");
    expect(orgRow?.via_org_id).toBe("org-A");
    expect(orgRow?.via_app_slug).toBe("case-predictor");
  });

  it("returns only user-direct subs when user has no orgs", async () => {
    const sbHarness = buildMultiSb(
      { data: [userSubFixture], error: null },
      { data: [], error: null },
      { data: [], error: null },
    );
    callerClientMock.mockReturnValue({ from: sbHarness.from });

    const result = await listUserSubscriptions({
      callerJwt: "jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result).toHaveLength(1);
    expect(result[0].via).toBe("user");
  });

  it("orders user-direct rows before via-org rows", async () => {
    const sbHarness = buildMultiSb(
      { data: [userSubFixture], error: null },
      { data: [{ org_id: "org-A", app_slug: "case-predictor" }], error: null },
      { data: [orgSubFixture], error: null },
    );
    callerClientMock.mockReturnValue({ from: sbHarness.from });

    const result = await listUserSubscriptions({
      callerJwt: "jwt",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result[0].via).toBe("user");
    expect(result[1].via).toBe("org");
  });
});
