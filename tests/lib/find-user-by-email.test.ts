import { describe, it, expect, vi, beforeEach } from "vitest";

const { callerClientMock } = vi.hoisted(() => ({
  callerClientMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: callerClientMock,
}));

import { findUserByEmail } from "../../lib/data";

beforeEach(() => {
  callerClientMock.mockReset();
});

// findUserByEmail issues up to 4 queries:
//   1. from("profiles").select().ilike().maybeSingle()       -> customer profile lookup
//   2. from("referrals").select().eq().maybeSingle()         -> referral row
//   3. from("partners").select().eq().maybeSingle()          -> partner record
//   4. from("profiles").select().eq().maybeSingle()          -> partner's profile (for email label)
function buildSb(opts: {
  customer: { data: unknown | null; error: { message: string } | null };
  referral: { data: unknown | null; error: { message: string } | null };
  partner?: { data: unknown | null; error: { message: string } | null };
  partnerProfile?: { data: unknown | null; error: { message: string } | null };
}) {
  // Customer profile chain: select -> ilike -> maybeSingle
  const custMaybeSingle = vi.fn().mockResolvedValue(opts.customer);
  const custIlike = vi.fn(() => ({ maybeSingle: custMaybeSingle }));
  const custSelect = vi.fn(() => ({ ilike: custIlike }));

  // Referral chain: select -> eq -> maybeSingle
  const refMaybeSingle = vi.fn().mockResolvedValue(opts.referral);
  const refEq = vi.fn(() => ({ maybeSingle: refMaybeSingle }));
  const refSelect = vi.fn(() => ({ eq: refEq }));

  // Partner chain: select -> eq -> maybeSingle
  const partMaybeSingle = vi.fn().mockResolvedValue(opts.partner ?? { data: null, error: null });
  const partEq = vi.fn(() => ({ maybeSingle: partMaybeSingle }));
  const partSelect = vi.fn(() => ({ eq: partEq }));

  // Partner profile chain: select -> eq -> maybeSingle (called as second profiles query)
  const ppMaybeSingle = vi.fn().mockResolvedValue(opts.partnerProfile ?? { data: null, error: null });
  const ppEq = vi.fn(() => ({ maybeSingle: ppMaybeSingle }));
  const ppSelect = vi.fn(() => ({ eq: ppEq }));

  // The profiles table is queried twice (customer + partner). Differentiate by call count.
  let profilesCallCount = 0;
  const from = vi.fn((table: string) => {
    if (table === "profiles") {
      profilesCallCount++;
      if (profilesCallCount === 1) return { select: custSelect };
      return { select: ppSelect };
    }
    if (table === "referrals") return { select: refSelect };
    if (table === "partners") return { select: partSelect };
    throw new Error("unexpected table " + table);
  });

  return {
    from,
    custMaybeSingle,
    refMaybeSingle,
    partMaybeSingle,
    ppMaybeSingle,
    custIlike,
  };
}

describe("findUserByEmail", () => {
  it("returns null when no profile matches", async () => {
    const sb = buildSb({
      customer: { data: null, error: null },
      referral: { data: null, error: null },
    });
    callerClientMock.mockReturnValue({ from: sb.from });

    const out = await findUserByEmail({ callerJwt: "jwt", email: "x@y.z" });
    expect(out).toBeNull();
  });

  it("returns user with no referral when none exists", async () => {
    const sb = buildSb({
      customer: { data: { id: "u1", email: "client@test.local" }, error: null },
      referral: { data: null, error: null },
    });
    callerClientMock.mockReturnValue({ from: sb.from });

    const out = await findUserByEmail({ callerJwt: "jwt", email: "Client@TEST.local" });
    expect(out).toMatchObject({
      userId: "u1",
      email: "client@test.local",
      hasReferral: false,
      currentReferral: null,
    });
    // ilike is called with normalized lowercase email
    expect(sb.custIlike).toHaveBeenCalledWith("email", "client@test.local");
  });

  it("returns user with current referral and partner email label", async () => {
    const sb = buildSb({
      customer: { data: { id: "u1", email: "client@test.local" }, error: null },
      referral: { data: { source_partner_id: "p1" }, error: null },
      partner: { data: { id: "p1", user_id: "pu1" }, error: null },
      partnerProfile: { data: { email: "partner@test.local" }, error: null },
    });
    callerClientMock.mockReturnValue({ from: sb.from });

    const out = await findUserByEmail({ callerJwt: "jwt", email: "client@test.local" });
    expect(out?.hasReferral).toBe(true);
    expect(out?.currentReferral?.partnerId).toBe("p1");
    expect(out?.currentReferral?.partnerLabel).toBe("partner@test.local");
  });

  it("falls back to truncated partner id when partner has no user", async () => {
    const sb = buildSb({
      customer: { data: { id: "u1", email: "client@test.local" }, error: null },
      referral: { data: { source_partner_id: "abcdef12-3456-7890-abcd-ef1234567890" }, error: null },
      partner: { data: { id: "abcdef12-3456-7890-abcd-ef1234567890", user_id: null }, error: null },
    });
    callerClientMock.mockReturnValue({ from: sb.from });

    const out = await findUserByEmail({ callerJwt: "jwt", email: "client@test.local" });
    expect(out?.currentReferral?.partnerLabel).toBe("abcdef12");
  });
});
