import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));

import { updatePartnerRegistrationAction } from "../../app/_actions/update-partner-registration";

function buildSb({
  userId = "user-1",
  currentEmail = "old@x.com",
}: { userId?: string | null; currentEmail?: string } = {}) {
  const partnerMaybe = vi
    .fn()
    .mockResolvedValue({ data: userId ? { user_id: userId } : null, error: null });
  const profileMaybe = vi.fn().mockResolvedValue({ data: { email: currentEmail }, error: null });
  const profileUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const updateUserById = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "partners") {
      return { select: () => ({ eq: () => ({ maybeSingle: partnerMaybe }) }) };
    }
    // profiles
    return {
      select: () => ({ eq: () => ({ maybeSingle: profileMaybe }) }),
      update: () => ({ eq: profileUpdateEq }),
    };
  });

  return {
    sb: { from, auth: { admin: { updateUserById } }, rpc },
    updateUserById,
    rpc,
  };
}

const okAuth = { claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "jwt" };
const valid = {
  partnerId: "22222222-2222-2222-2222-222222222222",
  fullName: "Novo Nome",
  email: "new@x.com",
  profile: { country: "BR", person_type: "individual", phone: "+5511999999999" },
  payoutMethods: [],
};

describe("updatePartnerRegistrationAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    adminClientMock.mockReset();
  });

  it("forbidden for non-super-admin", async () => {
    authMock.mockResolvedValue(null);
    const r = await updatePartnerRegistrationAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("validation error on bad input", async () => {
    authMock.mockResolvedValue(okAuth);
    const r = await updatePartnerRegistrationAction({ partnerId: "x", fullName: "", email: "no" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("rejects a partner with no linked user", async () => {
    authMock.mockResolvedValue(okAuth);
    adminClientMock.mockReturnValue(buildSb({ userId: null }).sb);
    const r = await updatePartnerRegistrationAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("changes the email when it differs and upserts the profile", async () => {
    authMock.mockResolvedValue(okAuth);
    const { sb, updateUserById, rpc } = buildSb({ currentEmail: "old@x.com" });
    adminClientMock.mockReturnValue(sb);
    const r = await updatePartnerRegistrationAction(valid);
    expect(r.ok).toBe(true);
    expect(updateUserById).toHaveBeenCalledWith("user-1", { email: "new@x.com", email_confirm: true });
    expect(rpc).toHaveBeenCalledWith("partner_profile_upsert", {
      p_partner_id: valid.partnerId,
      p_payload: valid.profile,
    });
  });

  it("does NOT touch auth email when unchanged", async () => {
    authMock.mockResolvedValue(okAuth);
    const { sb, updateUserById } = buildSb({ currentEmail: "new@x.com" });
    adminClientMock.mockReturnValue(sb);
    const r = await updatePartnerRegistrationAction(valid);
    expect(r.ok).toBe(true);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});
