import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, grantMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  grantMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  requireSuperAdminAAL2: authMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  grantMembership: grantMock,
}));

import { grantMembershipAction } from "../../app/_actions/grant-membership";

beforeEach(() => {
  authMock.mockReset();
  grantMock.mockReset();
});

describe("grantMembershipAction", () => {
  it("super-admin + valid input → ok: true with membershipId, wrapper called with right args", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });
    grantMock.mockResolvedValue({ membershipId: "m-1" });

    const result = await grantMembershipAction({
      userId: "33333333-3333-3333-3333-333333333333",
      appSlug: "case-predictor",
      roleSlug: "end-user",
    });

    expect(result).toEqual({ ok: true, membershipId: "m-1", suggestForceLogout: true });
    expect(grantMock).toHaveBeenCalledWith({
      userId: "33333333-3333-3333-3333-333333333333",
      appSlug: "case-predictor",
      roleSlug: "end-user",
      orgId: undefined,
      callerJwt: "jwt-1",
    });
  });

  it("non-super-admin → FORBIDDEN, wrapper not called", async () => {
    authMock.mockResolvedValue(null);

    const result = await grantMembershipAction({
      userId: "33333333-3333-3333-3333-333333333333",
      appSlug: "case-predictor",
      roleSlug: "end-user",
    });

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(grantMock).not.toHaveBeenCalled();
  });

  it("roleSlug 'partner-admin' without orgId → VALIDATION error", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });

    const result = await grantMembershipAction({
      userId: "33333333-3333-3333-3333-333333333333",
      appSlug: "case-predictor",
      roleSlug: "partner-admin",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });
});
