import { describe, it, expect, vi, beforeEach } from "vitest";

const { jwtMock, claimsMock, promoteMock } = vi.hoisted(() => ({
  jwtMock: vi.fn(),
  claimsMock: vi.fn(),
  promoteMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerJwt: jwtMock,
  getCallerClaims: claimsMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  promoteToSuperAdmin: promoteMock,
}));

import { promoteUserAction } from "../../app/_actions/promote-user";

beforeEach(() => {
  jwtMock.mockReset();
  claimsMock.mockReset();
  promoteMock.mockReset();
});

describe("promoteUserAction", () => {
  it("super-admin caller + valid input → ok: true, wrapper called with right args", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
    promoteMock.mockResolvedValue(undefined);

    const result = await promoteUserAction({
      userId: "11111111-1111-1111-1111-111111111111",
      reason: "needs super-admin access",
    });

    expect(result).toEqual({ ok: true });
    expect(promoteMock).toHaveBeenCalledWith({
      userId: "11111111-1111-1111-1111-111111111111",
      reason: "needs super-admin access",
      callerJwt: "jwt-1",
    });
  });

  it("non-super-admin → FORBIDDEN, wrapper not called", async () => {
    claimsMock.mockResolvedValue({ super_admin: false });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await promoteUserAction({
      userId: "11111111-1111-1111-1111-111111111111",
      reason: "needs super-admin access",
    });

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(promoteMock).not.toHaveBeenCalled();
  });

  it("short reason ('no') → VALIDATION error", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await promoteUserAction({
      userId: "11111111-1111-1111-1111-111111111111",
      reason: "no",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("wrapper rejects with Error → API_ERROR with message", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
    promoteMock.mockRejectedValue(new Error("rpc went boom"));

    const result = await promoteUserAction({
      userId: "11111111-1111-1111-1111-111111111111",
      reason: "needs super-admin access",
    });

    expect(result).toEqual({ ok: false, error: "API_ERROR", message: "rpc went boom" });
  });
});
