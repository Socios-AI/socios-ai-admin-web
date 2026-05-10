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

import { revokeReferralAction } from "../../app/_actions/revoke-referral";

const ADMIN_CLAIMS = { claims: { sub: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" };

const REFERRAL_ID = "11111111-1111-1111-1111-111111111111";
const CUSTOMER_ID = "22222222-2222-2222-2222-222222222222";
const PARTNER_ID = "33333333-3333-3333-3333-333333333333";

const validInput = { referralId: REFERRAL_ID };

type Ref = { id: string; customer_user_id: string; source_partner_id: string };

function buildSb(opts: {
  ref?: Ref | null;
  refErr?: { message: string } | null;
  locked?: { id: string } | null;
  lockedErr?: { message: string } | null;
  delErr?: { message: string } | null;
}) {
  const refMaybeSingle = vi.fn().mockResolvedValue({
    data:
      opts.ref === undefined
        ? {
            id: REFERRAL_ID,
            customer_user_id: CUSTOMER_ID,
            source_partner_id: PARTNER_ID,
          }
        : opts.ref,
    error: opts.refErr ?? null,
  });
  const refSelectEq = vi.fn(() => ({ maybeSingle: refMaybeSingle }));
  const refSelect = vi.fn(() => ({ eq: refSelectEq }));

  // subscriptions: .select().eq().not().limit().maybeSingle()
  const lockedMaybeSingle = vi.fn().mockResolvedValue({
    data: opts.locked ?? null,
    error: opts.lockedErr ?? null,
  });
  const lockedLimit = vi.fn(() => ({ maybeSingle: lockedMaybeSingle }));
  const lockedNot = vi.fn(() => ({ limit: lockedLimit }));
  const lockedEq = vi.fn(() => ({ not: lockedNot }));
  const lockedSelect = vi.fn(() => ({ eq: lockedEq }));

  const refDeleteEq = vi.fn().mockResolvedValue({ error: opts.delErr ?? null });
  const refDelete = vi.fn(() => ({ eq: refDeleteEq }));

  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "referrals") return { select: refSelect, delete: refDelete };
    if (table === "subscriptions") return { select: lockedSelect };
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });

  return { from, auditInsert, refDelete, refDeleteEq };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockReset();
  adminClientMock.mockReset();
});

describe("revokeReferralAction", () => {
  it("FORBIDDEN when claims is null", async () => {
    authMock.mockResolvedValue(null);
    const result = await revokeReferralAction(validInput);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
  });

  it("FORBIDDEN when caller is not super_admin", async () => {
    authMock.mockResolvedValue(null);
    const result = await revokeReferralAction(validInput);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
  });

  it("VALIDATION when referralId is not a UUID", async () => {
    authMock.mockResolvedValue(ADMIN_CLAIMS);
    const result = await revokeReferralAction({ referralId: "nope" });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("NOT_FOUND when referral does not exist", async () => {
    authMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({ ref: null });
    adminClientMock.mockReturnValue({ from: sb.from });
    const result = await revokeReferralAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("CONFLICT when a subscription has attribution_locked_at set", async () => {
    authMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({ locked: { id: "sub-1" } });
    adminClientMock.mockReturnValue({ from: sb.from });
    const result = await revokeReferralAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
    if (!result.ok) expect(result.message).toMatch(/travada/i);
  });

  it("API_ERROR when delete fails", async () => {
    authMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({ delErr: { message: "db down" } });
    adminClientMock.mockReturnValue({ from: sb.from });
    const result = await revokeReferralAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "API_ERROR" });
  });

  it("happy path: deletes and audits with referral.revoked and metadata", async () => {
    authMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({});
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await revokeReferralAction(validInput);

    expect(result).toEqual({ ok: true });
    expect(sb.refDeleteEq).toHaveBeenCalledWith("id", REFERRAL_ID);
    expect(sb.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "referral.revoked",
        actor_user_id: ADMIN_CLAIMS.claims.sub,
        target_user_id: CUSTOMER_ID,
        metadata: expect.objectContaining({
          referral_id: REFERRAL_ID,
          customer_user_id: CUSTOMER_ID,
          source_partner_id: PARTNER_ID,
        }),
      }),
    );

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(`/partners/${PARTNER_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/users/${CUSTOMER_ID}`);
  });
});
