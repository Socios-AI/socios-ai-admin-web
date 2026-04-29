import { describe, it, expect, vi, beforeEach } from "vitest";

const { claimsMock, adminClientMock, dbxMock, stripeMock } = vi.hoisted(() => ({
  claimsMock: vi.fn(),
  adminClientMock: vi.fn(),
  dbxMock: vi.fn(),
  stripeMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ getCallerClaims: claimsMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("../../lib/dropbox-sign-sync", () => ({ createEnvelopeForLicense: dbxMock }));
vi.mock("../../lib/stripe-connect-sync", () => ({ createLicensePaymentLink: stripeMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createPartnerInvitationAction } from "../../app/_actions/create-partner-invitation";

function buildSb(opts: { insertOk?: boolean } = {}) {
  const inserted = { id: "inv-1", invite_token: "tok-abc" };
  const insertSelect = vi.fn(() => ({
    single: vi.fn().mockResolvedValue(
      opts.insertOk === false
        ? { data: null, error: { message: "boom" } }
        : { data: inserted, error: null },
    ),
  }));
  const insert = vi.fn(() => ({ select: insertSelect }));
  const audit = vi.fn().mockResolvedValue({ error: null });
  return {
    from: vi.fn((table: string) => {
      if (table === "audit_log") return { insert: audit };
      return { insert };
    }),
    __audit: audit,
  };
}

describe("createPartnerInvitationAction", () => {
  beforeEach(() => {
    claimsMock.mockReset();
    adminClientMock.mockReset();
    dbxMock.mockReset();
    stripeMock.mockReset();
    dbxMock.mockResolvedValue({
      envelopeId: "MOCK_ENV_1",
      signingUrl: "https://mock-dropbox-sign.local/sign/inv-1",
      mocked: true,
    });
    stripeMock.mockResolvedValue({
      paymentLinkUrl: "https://mock-stripe.local/pay/inv-1",
      paymentLinkId: null,
      mocked: true,
    });
  });

  const valid = {
    email: "jane@example.com",
    fullName: "Jane Doe",
    licenseAmountUsd: 10000,
    installments: 1,
    expiresInDays: 30,
  };

  it("rejects non-super-admin", async () => {
    claimsMock.mockResolvedValue({ sub: "u", super_admin: false });
    const r = await createPartnerInvitationAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("rejects bad payload", async () => {
    claimsMock.mockResolvedValue({ sub: "u", super_admin: true });
    const r = await createPartnerInvitationAction({ email: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("creates invitation in mock mode", async () => {
    claimsMock.mockResolvedValue({ sub: "u", super_admin: true });
    const sb = buildSb();
    adminClientMock.mockReturnValue(sb);
    const r = await createPartnerInvitationAction(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.id).toBe("inv-1");
      expect(r.mocked_dropbox_sign).toBe(true);
      expect(r.mocked_stripe_connect).toBe(true);
      expect(r.invite_url).toMatch(/onboarding\/tok-abc$/);
    }
    expect(dbxMock).toHaveBeenCalledTimes(1);
    expect(stripeMock).toHaveBeenCalledTimes(1);
    expect(sb.__audit).toHaveBeenCalledTimes(1);
  });

  it("returns API_ERROR on insert failure", async () => {
    claimsMock.mockResolvedValue({ sub: "u", super_admin: true });
    adminClientMock.mockReturnValue(buildSb({ insertOk: false }));
    const r = await createPartnerInvitationAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("API_ERROR");
  });

  it("returns DROPBOX_SIGN_ERROR when envelope creation throws", async () => {
    claimsMock.mockResolvedValue({ sub: "u", super_admin: true });
    adminClientMock.mockReturnValue(buildSb());
    dbxMock.mockRejectedValueOnce(new Error("dbx down"));
    const r = await createPartnerInvitationAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("DROPBOX_SIGN_ERROR");
  });
});
