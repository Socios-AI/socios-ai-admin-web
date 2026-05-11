import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, rpcMock, getCallerClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  rpcMock: vi.fn(),
  getCallerClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  requireSuperAdminAAL2: authMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: getCallerClientMock,
}));

import { deleteUserAction } from "../../app/_actions/delete-user";

beforeEach(() => {
  authMock.mockReset();
  rpcMock.mockReset();
  getCallerClientMock.mockReset();
  getCallerClientMock.mockReturnValue({ rpc: rpcMock });
});

describe("deleteUserAction", () => {
  const validInput = {
    userId: "55555555-5555-5555-5555-555555555555",
    reason: "former contractor offboarding",
  };

  it("super-admin happy path → calls admin_delete_user with right args, ok: true", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });
    rpcMock.mockResolvedValue({ error: null });

    const result = await deleteUserAction(validInput);

    expect(result).toEqual({ ok: true });
    expect(getCallerClientMock).toHaveBeenCalledWith({ callerJwt: "jwt-1" });
    expect(rpcMock).toHaveBeenCalledWith("admin_delete_user", {
      p_target_user_id: validInput.userId,
      p_reason: validInput.reason,
    });
  });

  it("non-super-admin → FORBIDDEN, RPC not called", async () => {
    authMock.mockResolvedValue(null);

    const result = await deleteUserAction(validInput);

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("missing claims → FORBIDDEN, RPC not called", async () => {
    authMock.mockResolvedValue(null);

    const result = await deleteUserAction(validInput);

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("missing JWT → FORBIDDEN, RPC not called", async () => {
    authMock.mockResolvedValue(null);

    const result = await deleteUserAction(validInput);

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("short reason → VALIDATION error", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });

    const result = await deleteUserAction({ ...validInput, reason: "no" });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("invalid userId → VALIDATION error", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });

    const result = await deleteUserAction({ ...validInput, userId: "not-a-uuid" });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("RPC returns error (e.g. last super_admin guard) → API_ERROR with message", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });
    rpcMock.mockResolvedValue({
      error: { message: "cannot delete the last super_admin" },
    });

    const result = await deleteUserAction(validInput);

    expect(result).toEqual({
      ok: false,
      error: "API_ERROR",
      message: "cannot delete the last super_admin",
    });
  });

  it("RPC throws → API_ERROR with caught message", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "u1", aal: "aal2", exp: 9999999999 }, jwt: "jwt-1" });
    rpcMock.mockRejectedValue(new Error("network blew up"));

    const result = await deleteUserAction(validInput);

    expect(result).toEqual({
      ok: false,
      error: "API_ERROR",
      message: "network blew up",
    });
  });
});
