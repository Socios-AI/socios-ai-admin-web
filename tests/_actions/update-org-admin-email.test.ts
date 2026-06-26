import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireRegistrarOrAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));

import { updateOrgAdminEmailAction } from "../../app/_actions/update-org-admin-email";

function buildSb({
  roleCatalog = { "tenant-admin": "Admin" },
  adminUserId = "user-1",
  currentEmail = "old@x.com",
}: { roleCatalog?: Record<string, string> | null; adminUserId?: string | null; currentEmail?: string } = {}) {
  const appMaybe = vi.fn().mockResolvedValue({ data: roleCatalog ? { role_catalog: roleCatalog } : { role_catalog: {} }, error: null });
  const memMaybe = vi.fn().mockResolvedValue({ data: adminUserId ? { user_id: adminUserId } : null, error: null });
  const profileMaybe = vi.fn().mockResolvedValue({ data: { email: currentEmail }, error: null });
  const profileUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const updateUserById = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "apps") {
      return { select: () => ({ eq: () => ({ maybeSingle: appMaybe }) }) };
    }
    if (table === "app_memberships") {
      return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ maybeSingle: memMaybe }) }) }) }) }) };
    }
    // profiles
    return {
      select: () => ({ eq: () => ({ maybeSingle: profileMaybe }) }),
      update: () => ({ eq: profileUpdateEq }),
    };
  });

  return { sb: { from, auth: { admin: { updateUserById } } }, updateUserById, profileUpdateEq };
}

const superAuth = { claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "jwt" };
const registrarAuth = { claims: { sub: "g", super_admin: false, tier: "registrar", aal: "aal2", exp: 9999999999 }, jwt: "jwt" };
const valid = { orgId: "22222222-2222-2222-2222-222222222222", appSlug: "beauty", email: "New@X.com" };

describe("updateOrgAdminEmailAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    adminClientMock.mockReset();
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

  it("registrar updates the admin email (gotrue + profiles), lowercased", async () => {
    authMock.mockResolvedValue(registrarAuth);
    const { sb, updateUserById, profileUpdateEq } = buildSb({ currentEmail: "old@x.com" });
    adminClientMock.mockReturnValue(sb);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(true);
    expect(updateUserById).toHaveBeenCalledWith("user-1", { email: "new@x.com", email_confirm: true });
    expect(profileUpdateEq).toHaveBeenCalledWith("id", "user-1");
  });

  it("skips gotrue when email unchanged", async () => {
    authMock.mockResolvedValue(superAuth);
    const { sb, updateUserById } = buildSb({ currentEmail: "new@x.com" });
    adminClientMock.mockReturnValue(sb);
    const r = await updateOrgAdminEmailAction(valid);
    expect(r.ok).toBe(true);
    expect(updateUserById).not.toHaveBeenCalled();
  });
});
