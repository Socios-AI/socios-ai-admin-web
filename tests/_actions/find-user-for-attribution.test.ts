import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, findMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  requireSuperAdminAAL2: authMock,
}));

vi.mock("../../lib/data", () => ({
  findUserByEmail: findMock,
}));

import { findUserForAttributionAction } from "../../app/_actions/find-user-for-attribution";

beforeEach(() => {
  authMock.mockReset();
  findMock.mockReset();
});

describe("findUserForAttributionAction", () => {
  it("FORBIDDEN when caller is not super_admin", async () => {
    authMock.mockResolvedValue(null);
    const out = await findUserForAttributionAction("client@test.local");
    expect(out).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(findMock).not.toHaveBeenCalled();
  });

  it("VALIDATION when email too short", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin", aal: "aal2", exp: 9999999999 }, jwt: "jwt-token" });
    const out = await findUserForAttributionAction("a");
    expect(out).toMatchObject({ ok: false, error: "VALIDATION" });
    expect(findMock).not.toHaveBeenCalled();
  });

  it("happy path: returns user result", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin", aal: "aal2", exp: 9999999999 }, jwt: "jwt-token" });
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
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin", aal: "aal2", exp: 9999999999 }, jwt: "jwt-token" });
    findMock.mockRejectedValue(new Error("db down"));
    const out = await findUserForAttributionAction("client@test.local");
    expect(out).toMatchObject({ ok: false, error: "API_ERROR", message: "db down" });
  });
});
