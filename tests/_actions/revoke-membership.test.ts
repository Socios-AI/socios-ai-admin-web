import { describe, it, expect, vi, beforeEach } from "vitest";

const { jwtMock, claimsMock, revokeMock } = vi.hoisted(() => ({
  jwtMock: vi.fn(),
  claimsMock: vi.fn(),
  revokeMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerJwt: jwtMock,
  getCallerClaims: claimsMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  revokeMembership: revokeMock,
}));

import { revokeMembershipAction } from "../../app/_actions/revoke-membership";

beforeEach(() => {
  jwtMock.mockReset();
  claimsMock.mockReset();
  revokeMock.mockReset();
});

describe("revokeMembershipAction", () => {
  it("super-admin + valid input → ok: true with revokedAt, wrapper called", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
    revokeMock.mockResolvedValue({ revokedAt: "2026-04-23T00:00:00Z" });

    const result = await revokeMembershipAction({
      membershipId: "44444444-4444-4444-4444-444444444444",
      reason: "no longer needs access",
    });

    expect(result).toEqual({ ok: true, revokedAt: "2026-04-23T00:00:00Z" });
    expect(revokeMock).toHaveBeenCalledWith({
      membershipId: "44444444-4444-4444-4444-444444444444",
      reason: "no longer needs access",
      callerJwt: "jwt-1",
    });
  });

  it("non-super-admin → FORBIDDEN, wrapper not called", async () => {
    claimsMock.mockResolvedValue({ super_admin: false });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await revokeMembershipAction({
      membershipId: "44444444-4444-4444-4444-444444444444",
      reason: "no longer needs access",
    });

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it("short reason ('no') → VALIDATION error", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await revokeMembershipAction({
      membershipId: "44444444-4444-4444-4444-444444444444",
      reason: "no",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });
});
