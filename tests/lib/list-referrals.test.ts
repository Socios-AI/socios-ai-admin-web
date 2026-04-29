import { describe, it, expect, vi, beforeEach } from "vitest";

const { callerClientMock } = vi.hoisted(() => ({
  callerClientMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: callerClientMock,
}));

import { listReferralsForPartner } from "../../lib/data";

beforeEach(() => {
  callerClientMock.mockReset();
});

// Builds a mock supabase client for listReferralsForPartner's three queries:
//   1. from("referrals").select().eq().order()                  -> refsResult
//   2. from("profiles").select().in()                            -> profilesResult
//   3. from("subscriptions").select().in().eq()                  -> subsResult
function buildSb(
  refsResult: { data: unknown[] | null; error: { message: string } | null },
  profilesResult: { data: unknown[] | null; error: { message: string } | null },
  subsResult: { data: unknown[] | null; error: { message: string } | null },
) {
  const refsOrder = vi.fn().mockResolvedValue(refsResult);
  const refsEq = vi.fn(() => ({ order: refsOrder }));
  const refsSelect = vi.fn(() => ({ eq: refsEq }));

  const profIn = vi.fn().mockResolvedValue(profilesResult);
  const profSelect = vi.fn(() => ({ in: profIn }));

  const subsEq = vi.fn().mockResolvedValue(subsResult);
  const subsIn = vi.fn(() => ({ eq: subsEq }));
  const subsSelect = vi.fn(() => ({ in: subsIn }));

  const from = vi.fn((table: string) => {
    if (table === "referrals") return { select: refsSelect };
    if (table === "profiles") return { select: profSelect };
    if (table === "subscriptions") return { select: subsSelect };
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        in: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    };
  });

  return { from, refsOrder, refsEq, refsSelect, profIn, profSelect, subsEq, subsIn, subsSelect };
}

describe("listReferralsForPartner", () => {
  it("returns hydrated referrals with email + current sub", async () => {
    const sb = buildSb(
      {
        data: [
          {
            id: "r1",
            source_partner_id: "p1",
            customer_user_id: "u1",
            attribution_source: "affiliate_link",
            attributed_at: "2026-04-29T00:00:00Z",
          },
        ],
        error: null,
      },
      { data: [{ id: "u1", email: "client1@test.local" }], error: null },
      { data: [{ user_id: "u1", plan_id: "plan-x", status: "active" }], error: null },
    );
    callerClientMock.mockReturnValue({ from: sb.from });

    const out = await listReferralsForPartner({ callerJwt: "jwt", partnerId: "p1" });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      referralId: "r1",
      customerUserId: "u1",
      customerEmail: "client1@test.local",
      attributionSource: "affiliate_link",
    });
    expect(out[0].currentSub?.status).toBe("active");
    expect(out[0].currentSub?.planId).toBe("plan-x");
  });

  it("returns empty array when no referrals", async () => {
    const sb = buildSb(
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    );
    callerClientMock.mockReturnValue({ from: sb.from });

    const out = await listReferralsForPartner({ callerJwt: "jwt", partnerId: "p1" });
    expect(out).toEqual([]);
  });

  it("handles referral with no current sub gracefully", async () => {
    const sb = buildSb(
      {
        data: [
          {
            id: "r1",
            source_partner_id: "p1",
            customer_user_id: "u1",
            attribution_source: "manual",
            attributed_at: "2026-04-29T00:00:00Z",
          },
        ],
        error: null,
      },
      { data: [{ id: "u1", email: "client1@test.local" }], error: null },
      { data: [], error: null },
    );
    callerClientMock.mockReturnValue({ from: sb.from });

    const out = await listReferralsForPartner({ callerJwt: "jwt", partnerId: "p1" });
    expect(out[0].currentSub).toBeNull();
    expect(out[0].customerEmail).toBe("client1@test.local");
  });
});
