import { describe, it, expect, vi, beforeEach } from "vitest";

const { jwtMock, claimsMock, rpcMock, getCallerClientMock } = vi.hoisted(() => ({
  jwtMock: vi.fn(),
  claimsMock: vi.fn(),
  rpcMock: vi.fn(),
  getCallerClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerJwt: jwtMock,
  getCallerClaims: claimsMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: getCallerClientMock,
}));

import { resetUserMfaAction } from "../../app/_actions/reset-user-mfa";

beforeEach(() => {
  jwtMock.mockReset();
  claimsMock.mockReset();
  rpcMock.mockReset();
  getCallerClientMock.mockReset();
  getCallerClientMock.mockReturnValue({ rpc: rpcMock });
});

describe("resetUserMfaAction", () => {
  const validInput = {
    userId: "55555555-5555-5555-5555-555555555555",
    reason: "user lost authenticator",
  };

  it("super-admin happy path → ok with factorsDeleted from RPC", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
    rpcMock.mockResolvedValue({ data: 3, error: null });

    const result = await resetUserMfaAction(validInput);

    expect(result).toEqual({ ok: true, factorsDeleted: 3 });
    expect(rpcMock).toHaveBeenCalledWith("admin_reset_user_mfa", {
      p_target_user_id: validInput.userId,
      p_reason: validInput.reason,
    });
  });

  it("RPC returns 0 (user had no factors) → ok with factorsDeleted: 0", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
    rpcMock.mockResolvedValue({ data: 0, error: null });

    const result = await resetUserMfaAction(validInput);

    expect(result).toEqual({ ok: true, factorsDeleted: 0 });
  });

  it("non-numeric data → ok with factorsDeleted: 0 (defensive)", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
    rpcMock.mockResolvedValue({ data: null, error: null });

    const result = await resetUserMfaAction(validInput);

    expect(result).toEqual({ ok: true, factorsDeleted: 0 });
  });

  it("non-super-admin → FORBIDDEN, RPC not called", async () => {
    claimsMock.mockResolvedValue({ super_admin: false });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await resetUserMfaAction(validInput);

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("missing JWT → FORBIDDEN", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue(null);

    const result = await resetUserMfaAction(validInput);

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("short reason → VALIDATION", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await resetUserMfaAction({ ...validInput, reason: "no" });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("invalid userId → VALIDATION", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await resetUserMfaAction({ ...validInput, userId: "x" });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("RPC returns self-reset error → API_ERROR with that message", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "cannot reset your own MFA via this RPC" },
    });

    const result = await resetUserMfaAction(validInput);

    expect(result).toEqual({
      ok: false,
      error: "API_ERROR",
      message: "cannot reset your own MFA via this RPC",
    });
  });
});
