import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock, deriveMock, sendMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
  deriveMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireRegistrarOrAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("../../lib/admin-role-slug", () => ({ deriveAdminRoleSlug: deriveMock }));
vi.mock("../../lib/email-resend", () => ({ sendViaResend: sendMock }));

import { updateOrgAdminEmailAction } from "../../app/_actions/update-org-admin-email";

function buildSb({
  adminUserId = "user-1",
  currentEmail = "old@x.com",
}: { adminUserId?: string | null; currentEmail?: string } = {}) {
  const appMaybe = vi.fn().mockResolvedValue({
    data: { name: "Beauty", public_url: "https://beauty.x", role_catalog: { "tenant-admin": "Admin" }, metadata: {} },
    error: null,
  });
  const orgMaybe = vi.fn().mockResolvedValue({ data: { name: "Clínica X", metadata: { niche: "beauty" } }, error: null });
  const memMaybe = vi.fn().mockResolvedValue({ data: adminUserId ? { user_id: adminUserId } : null, error: null });
  const profileMaybe = vi.fn().mockResolvedValue({ data: { email: currentEmail, full_name: "Reg" }, error: null });
  const profileUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const updateUserById = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({ data: "tok-123", error: null });

  const from = vi.fn((table: string) => {
    if (table === "apps") return { select: () => ({ eq: () => ({ maybeSingle: appMaybe }) }) };
    if (table === "orgs") return { select: () => ({ eq: () => ({ maybeSingle: orgMaybe }) }) };
    if (table === "app_memberships") {
      return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ maybeSingle: memMaybe }) }) }) }) }) };
    }
    // profiles
    return {
      select: () => ({ eq: () => ({ maybeSingle: profileMaybe }) }),
      update: () => ({ eq: profileUpdateEq }),
    };
  });

  return { sb: { from, auth: { admin: { updateUserById } }, rpc }, updateUserById, profileUpdateEq, rpc };
}

const superAuth = { claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "jwt" };
const registrarAuth = { claims: { sub: "g", super_admin: false, tier: "registrar", aal: "aal2", exp: 9999999999 }, jwt: "jwt" };
const valid = { orgId: "22222222-2222-2222-2222-222222222222", appSlug: "beauty", email: "New@X.com" };

describe("updateOrgAdminEmailAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    adminClientMock.mockReset();
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
    adminClientMock.mockReturnValue(buildSb({ adminUserId: null }).sb);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("registrar: swaps login (lowercased) AND sends a new invite", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const { sb, updateUserById, profileUpdateEq, rpc } = buildSb({ currentEmail: "old@x.com" });
    adminClientMock.mockReturnValue(sb);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.emailSent).toBe(true);
    expect(updateUserById).toHaveBeenCalledWith("user-1", { email: "new@x.com", email_confirm: true });
    expect(profileUpdateEq).toHaveBeenCalledWith("id", "user-1");
    expect(rpc).toHaveBeenCalledWith("org_admin_invite", expect.objectContaining({ p_email: "new@x.com", p_role_slug: "tenant-admin" }));
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toEqual(expect.objectContaining({ to: "new@x.com" }));
  });

  it("no-op when email unchanged (no login swap, no invite)", async () => {
    authMock.mockResolvedValue(superAuth);
    const { sb, updateUserById, rpc } = buildSb({ currentEmail: "new@x.com" });
    adminClientMock.mockReturnValue(sb);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.emailSent).toBe(false);
    expect(updateUserById).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("best-effort email: ok with emailSent false when send throws", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const { sb } = buildSb({ currentEmail: "old@x.com" });
    adminClientMock.mockReturnValue(sb);
    sendMock.mockRejectedValue(new Error("resend down"));
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.emailSent).toBe(false);
  });

  it("hard API_ERROR when org_admin_invite rpc fails", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const { sb, rpc } = buildSb({ currentEmail: "old@x.com" });
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    adminClientMock.mockReturnValue(sb);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("API_ERROR");
  });

  it("FORBIDDEN when org_admin_invite returns 42501", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const { sb, rpc } = buildSb({ currentEmail: "old@x.com" });
    rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "denied" } });
    adminClientMock.mockReturnValue(sb);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });
});
