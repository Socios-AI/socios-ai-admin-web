import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock, callerClientMock, deriveMock, sendMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
  callerClientMock: vi.fn(),
  deriveMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireRegistrarOrAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock, getCallerClient: callerClientMock }));
vi.mock("../../lib/admin-role-slug", () => ({ deriveAdminRoleSlug: deriveMock }));
vi.mock("../../lib/email-resend", () => ({ sendViaResend: sendMock }));

import { updateOrgAdminEmailAction } from "../../app/_actions/update-org-admin-email";

function buildSb({
  adminUserId = "user-1",
  currentEmail = "old@x.com",
  isSuperAdmin = false,
  isStaff = false,
  appPublicUrl = "https://beauty.x",
}: { adminUserId?: string | null; currentEmail?: string; isSuperAdmin?: boolean; isStaff?: boolean; appPublicUrl?: string | null } = {}) {
  const appMaybe = vi.fn().mockResolvedValue({
    data: { name: "Beauty", public_url: appPublicUrl, role_catalog: { "tenant-admin": "Admin" }, metadata: {} },
    error: null,
  });
  const orgMaybe = vi.fn().mockResolvedValue({ data: { name: "Clínica X", metadata: { niche: "beauty" } }, error: null });
  const memMaybe = vi.fn().mockResolvedValue({ data: adminUserId ? { user_id: adminUserId } : null, error: null });
  const profileMaybe = vi.fn().mockResolvedValue({ data: { email: currentEmail, is_super_admin: isSuperAdmin, full_name: "Reg" }, error: null });
  const profileUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const updateUserById = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({ data: "tok-123", error: null });

  const from = vi.fn((table: string) => {
    if (table === "apps") return { select: () => ({ eq: () => ({ maybeSingle: appMaybe }) }) };
    if (table === "orgs") return { select: () => ({ eq: () => ({ maybeSingle: orgMaybe }) }) };
    if (table === "app_memberships") {
      return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ maybeSingle: memMaybe }) }) }) }) }) };
    }
    if (table === "platform_actors") {
      const rows = isStaff ? [{ tier: "registrar" }] : [];
      return { select: () => ({ eq: () => ({ is: () => ({ in: () => Promise.resolve({ data: rows, error: null }) }) }) }) };
    }
    return {
      select: () => ({ eq: () => ({ maybeSingle: profileMaybe }) }),
      update: () => ({ eq: profileUpdateEq }),
    };
  });

  const admin = { from, auth: { admin: { updateUserById } } };
  const caller = { rpc };
  return { admin, caller, updateUserById, profileUpdateEq, rpc };
}

const superAuth = { claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "jwt" };
const registrarAuth = { claims: { sub: "g", super_admin: false, tier: "registrar", aal: "aal2", exp: 9999999999 }, jwt: "jwt" };
const valid = { orgId: "22222222-2222-2222-2222-222222222222", appSlug: "beauty", email: "New@X.com" };

function wire(parts: ReturnType<typeof buildSb>) {
  adminClientMock.mockReturnValue(parts.admin);
  callerClientMock.mockReturnValue(parts.caller);
}

describe("updateOrgAdminEmailAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    adminClientMock.mockReset();
    callerClientMock.mockReset();
    deriveMock.mockReset();
    sendMock.mockReset();
    deriveMock.mockReturnValue("tenant-admin");
    sendMock.mockResolvedValue({ id: "msg-1" });
  });

  it("forbidden when gate returns null", async () => {
    authMock.mockResolvedValue(null);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("validation error on bad email", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const r = await updateOrgAdminEmailAction({ ...valid, email: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("validation when no admin membership found", async () => {
    authMock.mockResolvedValue(registrarAuth);
    wire(buildSb({ adminUserId: null }));
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("forbidden when target admin is a super_admin (no swap, no invite)", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const parts = buildSb({ isSuperAdmin: true });
    wire(parts);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
    expect(parts.updateUserById).not.toHaveBeenCalled();
    expect(parts.rpc).not.toHaveBeenCalled();
  });

  it("forbidden when target admin is platform staff (no swap, no invite)", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const parts = buildSb({ isStaff: true });
    wire(parts);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
    expect(parts.updateUserById).not.toHaveBeenCalled();
    expect(parts.rpc).not.toHaveBeenCalled();
  });

  it("registrar: sends invite (caller client) AND swaps login (lowercased)", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const parts = buildSb({ currentEmail: "old@x.com" });
    wire(parts);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.emailSent).toBe(true);
    expect(parts.rpc).toHaveBeenCalledWith("org_admin_invite", expect.objectContaining({ p_email: "new@x.com", p_role_slug: "tenant-admin" }));
    expect(parts.updateUserById).toHaveBeenCalledWith("user-1", { email: "new@x.com", email_confirm: true });
    expect(parts.profileUpdateEq).toHaveBeenCalledWith("id", "user-1");
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toEqual(expect.objectContaining({ to: "new@x.com" }));
  });

  it("no-op when email unchanged (no swap, no invite)", async () => {
    authMock.mockResolvedValue(superAuth);
    const parts = buildSb({ currentEmail: "new@x.com" });
    wire(parts);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.emailSent).toBe(false);
    expect(parts.updateUserById).not.toHaveBeenCalled();
    expect(parts.rpc).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("invite fails -> API_ERROR and NO login swap (no partial write)", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const parts = buildSb({ currentEmail: "old@x.com" });
    parts.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    wire(parts);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("API_ERROR");
    expect(parts.updateUserById).not.toHaveBeenCalled();
  });

  it("FORBIDDEN when org_admin_invite returns 42501", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const parts = buildSb({ currentEmail: "old@x.com" });
    parts.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "denied" } });
    wire(parts);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("VALIDATION e nada enviado quando o app é platform / sem public_url", async () => {
    authMock.mockResolvedValue(registrarAuth);
    // platform slug: guard trips on slug even with a public_url
    const parts1 = buildSb({ currentEmail: "old@x.com" });
    wire(parts1);
    const r1 = await updateOrgAdminEmailAction({ orgId: valid.orgId, appSlug: "platform", email: "new@x.com" });
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toBe("VALIDATION");
    expect(parts1.updateUserById).not.toHaveBeenCalled();
    expect(parts1.rpc).not.toHaveBeenCalled();

    // null public_url: guard trips on missing url
    const parts2 = buildSb({ currentEmail: "old@x.com", appPublicUrl: null });
    wire(parts2);
    const r2 = await updateOrgAdminEmailAction(valid);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toBe("VALIDATION");
    expect(parts2.updateUserById).not.toHaveBeenCalled();
    expect(parts2.rpc).not.toHaveBeenCalled();
  });

  it("best-effort email: ok with emailSent false when send throws", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const parts = buildSb({ currentEmail: "old@x.com" });
    wire(parts);
    sendMock.mockRejectedValue(new Error("resend down"));
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.emailSent).toBe(false);
  });
});
