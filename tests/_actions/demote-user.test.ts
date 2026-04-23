import { describe, it, expect, vi, beforeEach } from "vitest";

const { jwtMock, claimsMock, demoteMock } = vi.hoisted(() => ({
  jwtMock: vi.fn(),
  claimsMock: vi.fn(),
  demoteMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerJwt: jwtMock,
  getCallerClaims: claimsMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  demoteFromSuperAdmin: demoteMock,
}));

import { demoteUserAction } from "../../app/_actions/demote-user";

beforeEach(() => {
  jwtMock.mockReset();
  claimsMock.mockReset();
  demoteMock.mockReset();
});

describe("demoteUserAction", () => {
  it("super-admin caller + valid input → ok: true, wrapper called with right args", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
    demoteMock.mockResolvedValue(undefined);

    const result = await demoteUserAction({
      userId: "22222222-2222-2222-2222-222222222222",
      reason: "no longer needs super-admin",
    });

    expect(result).toEqual({ ok: true });
    expect(demoteMock).toHaveBeenCalledWith({
      userId: "22222222-2222-2222-2222-222222222222",
      reason: "no longer needs super-admin",
      callerJwt: "jwt-1",
    });
  });

  it("non-super-admin → FORBIDDEN, wrapper not called", async () => {
    claimsMock.mockResolvedValue({ super_admin: false });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await demoteUserAction({
      userId: "22222222-2222-2222-2222-222222222222",
      reason: "no longer needs super-admin",
    });

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(demoteMock).not.toHaveBeenCalled();
  });

  it("short reason ('no') → VALIDATION error", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await demoteUserAction({
      userId: "22222222-2222-2222-2222-222222222222",
      reason: "no",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });
});
