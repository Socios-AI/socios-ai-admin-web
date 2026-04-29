import { describe, it, expect, vi, beforeEach } from "vitest";

const { claimsMock, jwtMock, findMock } = vi.hoisted(() => ({
  claimsMock: vi.fn(),
  jwtMock: vi.fn(),
  findMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerClaims: claimsMock,
  getCallerJwt: jwtMock,
}));

vi.mock("../../lib/data", () => ({
  findUserByEmail: findMock,
}));

import { findUserForAttributionAction } from "../../app/_actions/find-user-for-attribution";

beforeEach(() => {
  claimsMock.mockReset();
  jwtMock.mockReset();
  findMock.mockReset();
});

describe("findUserForAttributionAction", () => {
  it("FORBIDDEN when caller is not super_admin", async () => {
    claimsMock.mockResolvedValue({ sub: "x", super_admin: false });
    const out = await findUserForAttributionAction("client@test.local");
    expect(out).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(findMock).not.toHaveBeenCalled();
  });

  it("VALIDATION when email too short", async () => {
    claimsMock.mockResolvedValue({ sub: "admin", super_admin: true });
    const out = await findUserForAttributionAction("a");
    expect(out).toMatchObject({ ok: false, error: "VALIDATION" });
    expect(findMock).not.toHaveBeenCalled();
  });

  it("happy path: returns user result", async () => {
    claimsMock.mockResolvedValue({ sub: "admin", super_admin: true });
    jwtMock.mockResolvedValue("jwt-token");
    findMock.mockResolvedValue({
      userId: "u1",
      email: "client@test.local",
      hasReferral: false,
      currentReferral: null,
    });
    const out = await findUserForAttributionAction("client@test.local");
    expect(out).toEqual({
      ok: true,
      result: {
        userId: "u1",
        email: "client@test.local",
        hasReferral: false,
        currentReferral: null,
      },
    });
    expect(findMock).toHaveBeenCalledWith({
      callerJwt: "jwt-token",
      email: "client@test.local",
    });
  });

  it("API_ERROR when findUserByEmail throws", async () => {
    claimsMock.mockResolvedValue({ sub: "admin", super_admin: true });
    jwtMock.mockResolvedValue("jwt-token");
    findMock.mockRejectedValue(new Error("db down"));
    const out = await findUserForAttributionAction("client@test.local");
    expect(out).toMatchObject({ ok: false, error: "API_ERROR", message: "db down" });
  });
});
