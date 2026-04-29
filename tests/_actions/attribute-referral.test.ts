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

import { attributeReferralAction } from "../../app/_actions/attribute-referral";

const ADMIN_CLAIMS = {
  sub: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  super_admin: true,
};

const validInput = {
  customerUserId: "11111111-1111-1111-1111-111111111111",
  sourcePartnerId: "22222222-2222-2222-2222-222222222222",
  attributionSource: "admin_assignment" as const,
};

function buildSb(opts: {
  existing?: { source_partner_id: string } | null;
  existingErr?: { message: string } | null;
  insertResult?: {
    data: { id: string } | null;
    error: { message: string } | null;
  };
}) {
  const refSelectMaybeSingle = vi.fn().mockResolvedValue({
    data: opts.existing ?? null,
    error: opts.existingErr ?? null,
  });
  const refSelectEq = vi.fn(() => ({ maybeSingle: refSelectMaybeSingle }));
  const refSelect = vi.fn(() => ({ eq: refSelectEq }));

  const refInsertSingle = vi
    .fn()
    .mockResolvedValue(
      opts.insertResult ?? { data: { id: "new-ref-id" }, error: null },
    );
  const refInsertSelect = vi.fn(() => ({ single: refInsertSingle }));
  const refInsert = vi.fn(() => ({ select: refInsertSelect }));

  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "referrals") return { select: refSelect, insert: refInsert };
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });

  return { from, auditInsert, refInsert };
}

beforeEach(() => {
  vi.clearAllMocks();
  claimsMock.mockReset();
  adminClientMock.mockReset();
});

describe("attributeReferralAction", () => {
  it("FORBIDDEN when claims is null", async () => {
    claimsMock.mockResolvedValue(null);
    const result = await attributeReferralAction(validInput);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("FORBIDDEN when caller is not super_admin", async () => {
    claimsMock.mockResolvedValue({ sub: "x", super_admin: false });
    const result = await attributeReferralAction(validInput);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
  });

  it("VALIDATION when customerUserId is not a UUID", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const result = await attributeReferralAction({
      ...validInput,
      customerUserId: "not-a-uuid",
    });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("CONFLICT when user already has a referral", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({
      existing: { source_partner_id: "33333333-3333-3333-3333-333333333333" },
    });
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await attributeReferralAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
    if (!result.ok) expect(result.message).toMatch(/Transferir/i);
  });

  it("API_ERROR when insert fails", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({
      insertResult: { data: null, error: { message: "db down" } },
    });
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await attributeReferralAction(validInput);
    expect(result).toMatchObject({ ok: false, error: "API_ERROR" });
  });

  it("happy path: returns ok with referralId, audits with referral.created and metadata", async () => {
    claimsMock.mockResolvedValue(ADMIN_CLAIMS);
    const sb = buildSb({});
    adminClientMock.mockReturnValue({ from: sb.from });

    const result = await attributeReferralAction(validInput);

    expect(result).toEqual({ ok: true, referralId: "new-ref-id" });
    expect(sb.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "referral.created",
        actor_user_id: ADMIN_CLAIMS.sub,
        target_user_id: validInput.customerUserId,
        metadata: expect.objectContaining({
          referral_id: "new-ref-id",
          customer_user_id: validInput.customerUserId,
          source_partner_id: validInput.sourcePartnerId,
          attribution_source: "admin_assignment",
        }),
      }),
    );

    const { revalidatePath } = await import("next/cache");
    expect(revalidatePath).toHaveBeenCalledWith(
      `/partners/${validInput.sourcePartnerId}`,
    );
    expect(revalidatePath).toHaveBeenCalledWith(
      `/users/${validInput.customerUserId}`,
    );
  });
});
