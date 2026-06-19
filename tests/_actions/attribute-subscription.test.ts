import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, callerClientMock, rpcMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  callerClientMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireSuperAdminAAL2: authMock }));
vi.mock("@socios-ai/auth/admin", () => ({ getCallerClient: callerClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { attributeSubscriptionAction } from "../../app/_actions/attribute-subscription";

const SUB = "11111111-1111-1111-1111-111111111111";
const PARTNER = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  authMock.mockReset();
  callerClientMock.mockReset();
  rpcMock.mockReset();
  rpcMock.mockResolvedValue({ error: null });
  callerClientMock.mockReturnValue({ rpc: rpcMock });
});

describe("attributeSubscriptionAction", () => {
  it("FORBIDDEN para não super-admin, RPC não chamado", async () => {
    authMock.mockResolvedValue(null);
    const r = await attributeSubscriptionAction({ subscriptionId: SUB, partnerId: PARTNER });
    expect(r).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("VALIDATION para uuid inválido", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "jwt" });
    const r = await attributeSubscriptionAction({ subscriptionId: "x", partnerId: PARTNER });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("VALIDATION");
  });

  it("atribui: chama o RPC com subscription + partner", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "jwt" });
    const r = await attributeSubscriptionAction({ subscriptionId: SUB, partnerId: PARTNER });
    expect(r).toEqual({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith("admin_attribute_subscription", {
      p_subscription_id: SUB,
      p_partner_id: PARTNER,
    });
  });

  it("desatribui: partnerId null é aceito e repassado", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "jwt" });
    const r = await attributeSubscriptionAction({ subscriptionId: SUB, partnerId: null });
    expect(r).toEqual({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith("admin_attribute_subscription", {
      p_subscription_id: SUB,
      p_partner_id: null,
    });
  });

  it("mapeia 42501 do RPC para FORBIDDEN", async () => {
    authMock.mockResolvedValue({ claims: { sub: "u", super_admin: true, aal: "aal2", exp: 9999999999 }, jwt: "jwt" });
    rpcMock.mockResolvedValue({ error: { code: "42501", message: "super admin required" } });
    const r = await attributeSubscriptionAction({ subscriptionId: SUB, partnerId: PARTNER });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });
});
