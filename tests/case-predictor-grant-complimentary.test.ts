import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock, mockSingle, mockRpc } = vi.hoisted(() => {
  const single = vi.fn();
  const rpc = vi.fn();
  return {
    authMock: vi.fn(),
    mockSingle: single,
    mockRpc: rpc,
    adminClientMock: vi.fn(() => {
      const builder: Record<string, unknown> = {};
      builder.from = vi.fn(() => builder);
      builder.select = vi.fn(() => builder);
      builder.eq = vi.fn(() => builder);
      builder.single = single;
      builder.rpc = rpc;
      return builder;
    }),
  };
});

vi.mock("../lib/auth", () => ({
  requireSuperAdminAAL2: authMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getSupabaseAdminClient: adminClientMock,
}));

import { grantComplimentaryAction } from "../app/_actions/case-predictor/grant-complimentary";

beforeEach(() => {
  authMock.mockReset();
  adminClientMock.mockClear();
  mockSingle.mockReset();
  mockRpc.mockReset();
});

describe("grantComplimentaryAction", () => {
  it("rejects non-super-admin with FORBIDDEN", async () => {
    authMock.mockResolvedValue(null);
    const r = await grantComplimentaryAction({ email: "x@y.com", reason: "VIP" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("rejects invalid email", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    const r = await grantComplimentaryAction({ email: "not-an-email", reason: "VIP" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("INVALID_EMAIL");
  });

  it("rejects short reason", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    const r = await grantComplimentaryAction({ email: "u@k4.test", reason: "no" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("REASON_TOO_SHORT");
  });

  it("resolves email to user_id and calls RPC", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    mockSingle.mockResolvedValue({ data: { id: "user-1" }, error: null });
    mockRpc.mockResolvedValue({ data: "order-uuid-123", error: null });
    const result = await grantComplimentaryAction({ email: "test@k4.test", reason: "VIP customer" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.orderId).toBe("order-uuid-123");
    expect(mockRpc).toHaveBeenCalledWith("grant_case_predictor_complimentary_order", {
      p_user_id: "user-1",
      p_lead_id: null,
      p_reason: "VIP customer",
    });
  });

  it("rejects when email not found", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    mockSingle.mockResolvedValue({ data: null, error: { message: "no rows" } });
    const result = await grantComplimentaryAction({ email: "missing@k4.test", reason: "VIP customer" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("USER_NOT_FOUND");
  });

  it("propagates RPC errors", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "admin-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    mockSingle.mockResolvedValue({ data: { id: "user-1" }, error: null });
    mockRpc.mockResolvedValue({ data: null, error: { message: "rpc failed" } });
    const result = await grantComplimentaryAction({ email: "u@k4.test", reason: "VIP customer" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("RPC_ERROR");
  });
});
