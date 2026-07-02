import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, callerClientMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  callerClientMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getCallerClient: callerClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setEdgeRateAction } from "../../app/_actions/set-edge-rate";

const AUTH = { claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" };
const valid = { childPartnerId: "22222222-2222-2222-2222-222222222222", rate: 0.25, revenueKind: "subscription" as const };

function sbWith(error: { code?: string; message: string } | null) {
  const rpc = vi.fn().mockResolvedValue({ error });
  return { rpc, client: { rpc } };
}

describe("setEdgeRateAction", () => {
  beforeEach(() => {
    authMock.mockReset();
    callerClientMock.mockReset();
  });

  it("forbidden for non-super-admin", async () => {
    authMock.mockResolvedValue(null);
    const r = await setEdgeRateAction(valid);
    expect(r).toEqual({ ok: false, error: "FORBIDDEN" });
  });

  it("validation error on bad input", async () => {
    authMock.mockResolvedValue(AUTH);
    const r = await setEdgeRateAction({ childPartnerId: "x", rate: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("happy path calls set_partner_edge_rate with mapped args", async () => {
    authMock.mockResolvedValue(AUTH);
    const sb = sbWith(null);
    callerClientMock.mockReturnValue(sb.client);
    const r = await setEdgeRateAction(valid);
    expect(r).toEqual({ ok: true });
    expect(sb.rpc).toHaveBeenCalledWith("set_partner_edge_rate", {
      p_child_partner_id: valid.childPartnerId,
      p_rate: 0.25,
      p_revenue_kind: "subscription",
    });
  });

  it("maps 42501 to FORBIDDEN", async () => {
    authMock.mockResolvedValue(AUTH);
    callerClientMock.mockReturnValue(sbWith({ code: "42501", message: "not allowed" }).client);
    const r = await setEdgeRateAction(valid);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("23514 filho>=pai surfaces the 'menor que o nível acima' message", async () => {
    authMock.mockResolvedValue(AUTH);
    callerClientMock.mockReturnValue(
      sbWith({ code: "23514", message: "child rate 0.35 must be below parent rate 0.30" }).client,
    );
    const r = await setEdgeRateAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("VALIDATION");
      expect(r.message).toMatch(/menor que/i);
    }
  });

  it("23514 range error surfaces the 0-1 message", async () => {
    authMock.mockResolvedValue(AUTH);
    callerClientMock.mockReturnValue(sbWith({ code: "23514", message: "rate must be between 0 and 1" }).client);
    const r = await setEdgeRateAction(valid);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("VALIDATION");
      expect(r.message).toMatch(/entre 0 e 1/i);
    }
  });

  it("other error → API_ERROR", async () => {
    authMock.mockResolvedValue(AUTH);
    callerClientMock.mockReturnValue(sbWith({ code: "XX999", message: "boom" }).client);
    const r = await setEdgeRateAction(valid);
    if (!r.ok) expect(r.error).toBe("API_ERROR");
  });
});
