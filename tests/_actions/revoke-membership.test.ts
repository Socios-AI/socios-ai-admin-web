import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, revokeMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  revokeMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  requireSuperAdminAAL2: authMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  revokeMembership: revokeMock,
}));

import { revokeMembershipAction } from "../../app/_actions/revoke-membership";

beforeEach(() => {
  authMock.mockReset();
  revokeMock.mockReset();
});

describe("revokeMembershipAction", () => {
  it("super-admin + valid input → ok: true with revokedAt, wrapper called", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });
    revokeMock.mockResolvedValue({ revokedAt: "2026-04-23T00:00:00Z" });

    const result = await revokeMembershipAction({
      membershipId: "44444444-4444-4444-4444-444444444444",
      reason: "no longer needs access",
    });

    expect(result).toEqual({
      ok: true,
      revokedAt: "2026-04-23T00:00:00Z",
      suggestForceLogout: true,
    });
    expect(revokeMock).toHaveBeenCalledWith({
      membershipId: "44444444-4444-4444-4444-444444444444",
      reason: "no longer needs access",
      callerJwt: "jwt-1",
    });
  });

  it("non-super-admin → FORBIDDEN, wrapper not called", async () => {
    authMock.mockResolvedValue(null);

    const result = await revokeMembershipAction({
      membershipId: "44444444-4444-4444-4444-444444444444",
      reason: "no longer needs access",
    });

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it("short reason ('no') → VALIDATION error", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });

    const result = await revokeMembershipAction({
      membershipId: "44444444-4444-4444-4444-444444444444",
      reason: "no",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });
});
