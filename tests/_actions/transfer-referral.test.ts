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

import { transferReferralAction } from "../../app/_actions/transfer-referral";

const ADMIN_CLAIMS = {
  sub: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  super_admin: true,
};

const REFERRAL_ID = "11111111-1111-1111-1111-111111111111";
const CUSTOMER_ID = "22222222-2222-2222-2222-222222222222";
const FROM_PARTNER = "33333333-3333-3333-3333-333333333333";
const TO_PARTNER = "44444444-4444-4444-4444-444444444444";

const validInput = {
  referralId: REFERRAL_ID,
  toPartnerId: TO_PARTNER,
};

type Ref = { id: string; customer_user_id: string; source_partner_id: string };

function buildSb(opts: {
  ref?: Ref | null;
  refErr?: { message: string } | null;
  dest?: { id: string; status: string } | null;
  destErr?: { message: string } | null;
  locked?: { id: string } | null;
  lockedErr?: { message: string } | null;
  updErr?: { message: string } | null;
}) {
  const refMaybeSingle = vi.fn().mockResolvedValue({
    data:
      opts.ref === undefined
        ? {
            id: REFERRAL_ID,
            customer_user_id: CUSTOMER_ID,
            source_partner_id: FROM_PARTNER,
          }
        : opts.ref,
    error: opts.refErr ?? null,
  });
  const refSelectEq = vi.fn(() => ({ maybeSingle: refMaybeSingle }));
  const refSelect = vi.fn(() => ({ eq: refSelectEq }));

  const refUpdateEq = vi.fn().mockResolvedValue({ error: opts.updErr ?? null });
  const refUpdate = vi.fn(() => ({ eq: refUpdateEq }));

  // partners: .select().eq().maybeSingle()
  const partnerMaybeSingle = vi.fn().mockResolvedValue({
    data:
      opts.dest === undefined
        ? { id: TO_PARTNER, status: "active" }
        : opts.dest,
    error: opts.destErr ?? null,
  });
  const partnerSelectEq = vi.fn(() => ({ maybeSingle: partnerMaybeSingle }));
  const partnerSelect = vi.fn(() => ({ eq: partnerSelectEq }));

  // subscriptions: .select().eq().not().limit().maybeSingle()
  const lockedMaybeSingle = vi.fn().mockResolvedValue({
    data: opts.locked ?? null,
    error: opts.lockedErr ?? null,
  });
  const lockedLimit = vi.fn(() => ({ maybeSingle: lockedMaybeSingle }));
  const lockedNot = vi.fn(() => ({ limit: lockedLimit }));
  const lockedEq = vi.fn(() => ({ not: lockedNot }));
  const lockedSelect = vi.fn(() => ({ eq: lockedEq }));

  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "referrals") return { select: refSelect, update: refUpdate };
    if (table === "partners") return { select: partnerSelect };
    if (table === "subscriptions") return { select: lockedSelect };
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });

  return { from, auditInsert, refUpdate };
}

beforeEach(() => {
  vi.clearAllMocks();
  claimsMock.mockReset();
  adminClientMock.mockReset();
});

describe("transferReferralAction", () => {
  it("FORBIDDEN when caller is not super_admin", async () => {
    claimsMock.mockResolvedValue({ sub: "x", super_admin: false });
    const result = await transferReferralAction(validInput);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
  });

  it("VALIDATION when referralId is not a UUID", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const result = await transferReferralAction({
      referralId: "nope",
      toPartnerId: TO_PARTNER,
    });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("NOT_FOUND when referral does not exist", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({ ref: null });
    adminClientMock.mockReturnValue({ from: sb.from });
    const result = await transferReferralAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
  });

  it("VALIDATION when destination is the same as origin", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({});
    adminClientMock.mockReturnValue({ from: sb.from });
    const result = await transferReferralAction({
      referralId: REFERRAL_ID,
      toPartnerId: FROM_PARTNER,
    });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
    if (!result.ok) expect(result.message).toMatch(/mesmo/i);
  });

  it("CONFLICT when destination partner is not active", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({ dest: { id: TO_PARTNER, status: "suspended" } });
    adminClientMock.mockReturnValue({ from: sb.from });
    const result = await transferReferralAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
    if (!result.ok) expect(result.message).toMatch(/ativo/i);
  });

  it("CONFLICT when attribution is locked", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({ locked: { id: "sub-1" } });
    adminClientMock.mockReturnValue({ from: sb.from });
    const result = await transferReferralAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
    if (!result.ok) expect(result.message).toMatch(/travada/i);
  });

  it("API_ERROR when update fails", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({ updErr: { message: "db down" } });
    adminClientMock.mockReturnValue({ from: sb.from });
    const result = await transferReferralAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "API_ERROR" });
  });

  it("happy path: updates and audits with referral.transferred + from/to partner ids", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({});
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await transferReferralAction(validInput);

    expect(result).toEqual({ ok: true });
    expect(sb.refUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        source_partner_id: TO_PARTNER,
        attribution_source: "admin_assignment",
      }),
    );
    expect(sb.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "referral.transferred",
        actor_user_id: ADMIN_CLAIMS.sub,
        target_user_id: CUSTOMER_ID,
        metadata: expect.objectContaining({
          referral_id: REFERRAL_ID,
          customer_user_id: CUSTOMER_ID,
          from_partner_id: FROM_PARTNER,
          to_partner_id: TO_PARTNER,
        }),
      }),
    );

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(`/partners/${FROM_PARTNER}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/partners/${TO_PARTNER}`);
    expect(revalidatePath).toHaveBeenCalledWith(`/users/${CUSTOMER_ID}`);
  });
});
