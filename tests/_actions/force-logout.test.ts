import { describe, it, expect, vi, beforeEach } from "vitest";

const { jwtMock, claimsMock, forceMock } = vi.hoisted(() => ({
  jwtMock: vi.fn(),
  claimsMock: vi.fn(),
  forceMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerJwt: jwtMock,
  getCallerClaims: claimsMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  forceLogout: forceMock,
}));

import { forceLogoutAction } from "../../app/_actions/force-logout";

beforeEach(() => {
  jwtMock.mockReset();
  claimsMock.mockReset();
  forceMock.mockReset();
});

describe("forceLogoutAction", () => {
  it("super-admin → ok: true, wrapper called with targetUserId and right args", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
    forceMock.mockResolvedValue(undefined);

    const result = await forceLogoutAction({
      userId: "55555555-5555-5555-5555-555555555555",
      reason: "security violation detected",
    });

    expect(result).toEqual({ ok: true });
    expect(forceMock).toHaveBeenCalledWith({
      targetUserId: "55555555-5555-5555-5555-555555555555",
      reason: "security violation detected",
      callerJwt: "jwt-1",
    });
  });

  it("non-super-admin → FORBIDDEN, wrapper not called", async () => {
    claimsMock.mockResolvedValue({ super_admin: false });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await forceLogoutAction({
      userId: "55555555-5555-5555-5555-555555555555",
      reason: "security violation detected",
    });

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(forceMock).not.toHaveBeenCalled();
  });

  it("short reason ('no') → VALIDATION error", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await forceLogoutAction({
      userId: "55555555-5555-5555-5555-555555555555",
      reason: "no",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });
});
