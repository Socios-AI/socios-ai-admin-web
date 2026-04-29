import { describe, it, expect, vi, beforeEach } from "vitest";

const { callerClientMock } = vi.hoisted(() => ({
  callerClientMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: callerClientMock,
}));

import {
  listPartners,
  getPartner,
  listPartnerInvitations,
  getPartnerInvitation,
} from "../../lib/data";

// Build a mock Supabase client whose query chain matches the patterns used by
// list*/get* helpers in lib/data.ts:
//   list:  from(table).select("*").order(...)            (with optional .eq before .order)
//   get:   from(table).select("*").eq(col, val).maybeSingle()
function buildClient(rows: unknown[]) {
  const orderResult = { data: rows, error: null };
  const order = vi.fn().mockResolvedValue(orderResult);
  const maybeSingle = vi.fn().mockResolvedValue({ data: rows[0] ?? null, error: null });
  const eq = vi.fn(() => ({ order, maybeSingle }));
  const select = vi.fn(() => ({ order, eq }));
  return { from: vi.fn(() => ({ select })) };
}

describe("listPartners", () => {
  beforeEach(() => {
    callerClientMock.mockReset();
  });

  it("returns rows from partners table", async () => {
    const partners = [{ id: "p1", status: "active", user_id: "u1" }];
    callerClientMock.mockReturnValue(buildClient(partners));
    const r = await listPartners({ callerJwt: "jwt" });
    expect(r).toEqual(partners);
  });

  it("filters by status when provided", async () => {
    const client = buildClient([]);
    callerClientMock.mockReturnValue(client);
    await listPartners({ callerJwt: "jwt", status: "suspended" });
    expect(client.from).toHaveBeenCalledWith("partners");
  });

  it("throws on db error", async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    callerClientMock.mockReturnValue({
      from: () => ({ select: () => ({ order, eq: () => ({ order }) }) }),
    });
    await expect(listPartners({ callerJwt: "jwt" })).rejects.toThrow(/listPartners failed: boom/);
  });
});

describe("getPartner / getPartnerInvitation / listPartnerInvitations basics", () => {
  beforeEach(() => {
    callerClientMock.mockReset();
  });

  it("getPartner returns row", async () => {
    callerClientMock.mockReturnValue(buildClient([{ id: "p1", status: "active" }]));
    const r = await getPartner({ callerJwt: "jwt", partnerId: "p1" });
    expect(r?.id).toBe("p1");
  });

  it("listPartnerInvitations returns rows", async () => {
    const invs = [{ id: "i1", status: "sent", email: "a@b.c" }];
    callerClientMock.mockReturnValue(buildClient(invs));
    const r = await listPartnerInvitations({ callerJwt: "jwt" });
    expect(r).toEqual(invs);
  });

  it("getPartnerInvitation returns row", async () => {
    callerClientMock.mockReturnValue(buildClient([{ id: "i1", email: "a@b.c" }]));
    const r = await getPartnerInvitation({ callerJwt: "jwt", invitationId: "i1" });
    expect(r?.id).toBe("i1");
  });
});
