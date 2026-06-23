import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));

import { updateOrgAction } from "../../app/_actions/update-org";

function buildSb() {
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: updateEq }));
  return { sb: { from: vi.fn(() => ({ update })) }, update, updateEq };
}

const okAuth = { claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "jwt" };
const valid = { orgId: "22222222-2222-2222-2222-222222222222", name: "Clínica Nova" };

describe("updateOrgAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    adminClientMock.mockReset();
  });

  it("forbidden for non-super-admin", async () => {
    authMock.mockResolvedValue(null);
    const r = await updateOrgAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("validation error on short name", async () => {
    authMock.mockResolvedValue(okAuth);
    const r = await updateOrgAction({ orgId: valid.orgId, name: "X" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("updates the org name", async () => {
    authMock.mockResolvedValue(okAuth);
    const { sb, update, updateEq } = buildSb();
    adminClientMock.mockReturnValue(sb);
    const r = await updateOrgAction(valid);
    expect(r.ok).toBe(true);
    expect(update).toHaveBeenCalledWith({ name: "Clínica Nova" });
    expect(updateEq).toHaveBeenCalledWith("id", valid.orgId);
  });
});
