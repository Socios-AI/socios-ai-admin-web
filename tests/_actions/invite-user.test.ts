import { describe, it, expect, vi, beforeEach } from "vitest";

const { jwtMock, claimsMock, createMock } = vi.hoisted(() => ({
  jwtMock: vi.fn(),
  claimsMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerJwt: jwtMock,
  getCallerClaims: claimsMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  createUserWithMembership: createMock,
}));

import { inviteUserAction } from "../../app/_actions/invite-user";

beforeEach(() => {
  jwtMock.mockReset();
  claimsMock.mockReset();
  createMock.mockReset();
});

describe("inviteUserAction", () => {
  it("happy path: super-admin caller, valid input → ok: true with userId and actionLink", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");
    createMock.mockResolvedValue({ userId: "user-abc", actionLink: "https://id.sociosai.com/set-password?token=xyz" });

    const result = await inviteUserAction({
      email: "john@example.com",
      fullName: "John Doe",
      appSlug: "case-predictor",
      roleSlug: "end-user",
    });

    expect(result).toEqual({ ok: true, userId: "user-abc", actionLink: "https://id.sociosai.com/set-password?token=xyz" });
    expect(createMock).toHaveBeenCalledWith({
      email: "john@example.com",
      fullName: "John Doe",
      appSlug: "case-predictor",
      roleSlug: "end-user",
      orgId: undefined,
      redirectTo: "https://id.sociosai.com/set-password",
    });
  });

  it("non-super-admin caller → FORBIDDEN, wrapper not called", async () => {
    claimsMock.mockResolvedValue({ super_admin: false });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await inviteUserAction({
      email: "john@example.com",
      fullName: "John Doe",
      appSlug: "case-predictor",
      roleSlug: "end-user",
    });

    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("invalid email → VALIDATION error", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await inviteUserAction({
      email: "not-an-email",
      fullName: "John Doe",
      appSlug: "case-predictor",
      roleSlug: "end-user",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("roleSlug 'partner-member' without orgId → VALIDATION error", async () => {
    claimsMock.mockResolvedValue({ super_admin: true });
    jwtMock.mockResolvedValue("jwt-1");

    const result = await inviteUserAction({
      email: "john@example.com",
      fullName: "John Doe",
      appSlug: "case-predictor",
      roleSlug: "partner-member",
    });

    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });
});
