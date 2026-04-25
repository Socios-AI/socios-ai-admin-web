import { describe, it, expect, vi, beforeEach } from "vitest";

const { jwtMock, claimsMock, grantMock } = vi.hoisted(() => ({
  jwtMock: vi.fn(),
  claimsMock: vi.fn(),
  grantMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerJwt: jwtMock,
  getCallerClaims: claimsMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  grantMembership: grantMock,
}));

import { grantMembershipAction } from "../../app/_actions/grant-membership";

beforeEach(() => {
  jwtMock.mockReset();
  claimsMock.mockReset();
  grantMock.mockReset();
});

describe("grantMembershipAction", () => {
  it("super-admin + valid input → ok: true with membershipId, wrapper called with right args", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
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
    claimsMock.mockResolvedValue({ super_admin: false });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await grantMembershipAction({
      userId: "33333333-3333-3333-3333-333333333333",
      appSlug: "case-predictor",
      roleSlug: "end-user",
    });

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(grantMock).not.toHaveBeenCalled();
  });

  it("roleSlug 'partner-admin' without orgId → VALIDATION error", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await grantMembershipAction({
      userId: "33333333-3333-3333-3333-333333333333",
      appSlug: "case-predictor",
      roleSlug: "partner-admin",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });
});
