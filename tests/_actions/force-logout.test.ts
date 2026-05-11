import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, forceMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  forceMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  requireSuperAdminAAL2: authMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  forceLogout: forceMock,
}));

import { forceLogoutAction } from "../../app/_actions/force-logout";

beforeEach(() => {
  authMock.mockReset();
  forceMock.mockReset();
});

describe("forceLogoutAction", () => {
  it("super-admin → ok: true, wrapper called with targetUserId and right args", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });
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
    authMock.mockResolvedValue(null);

    const result = await forceLogoutAction({
      userId: "55555555-5555-5555-5555-555555555555",
      reason: "security violation detected",
    });

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(forceMock).not.toHaveBeenCalled();
  });

  it("short reason ('no') → VALIDATION error", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });

    const result = await forceLogoutAction({
      userId: "55555555-5555-5555-5555-555555555555",
      reason: "no",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });
});
