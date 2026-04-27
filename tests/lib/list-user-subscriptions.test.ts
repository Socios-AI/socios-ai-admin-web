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

function buildSb(rows: unknown[] | null, error: { message: string } | null = null) {
  const order = vi.fn().mockResolvedValue({ data: rows, error });
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from, order, eq, select };
}

describe("listUserSubscriptions", () => {
  it("returns mapped rows ordered by created_at desc", async () => {
    const sbHarness = buildSb([
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
      },
    ]);
    expect(sbHarness.from).toHaveBeenCalledWith("subscriptions");
    expect(sbHarness.eq).toHaveBeenCalledWith("user_id", "11111111-1111-1111-1111-111111111111");
  });

  it("returns empty array when user has no subscriptions", async () => {
    const sbHarness = buildSb([]);
    callerClientMock.mockReturnValue({ from: sbHarness.from });

    const result = await listUserSubscriptions({
      callerJwt: "jwt-1",
      userId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result).toEqual([]);
  });

  it("handles missing notes (no metadata.notes)", async () => {
    const sbHarness = buildSb([
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
    const sbHarness = buildSb(null, { message: "RLS denied" });
    callerClientMock.mockReturnValue({ from: sbHarness.from });

    await expect(
      listUserSubscriptions({
        callerJwt: "jwt-1",
        userId: "11111111-1111-1111-1111-111111111111",
      }),
    ).rejects.toThrow(/RLS denied/);
  });
});
