import { describe, it, expect, vi, beforeEach } from "vitest";

const { jwtMock, callerClientMock, queryBuilder } = vi.hoisted(() => {
  const builder: {
    from: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    range: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
  } = {
    from: vi.fn(() => builder),
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: "order-1",
            user_id: null,
            case_predictor_lead_id: "lead-1",
            partner_id_attribution: null,
            price_amount_cents: 9900,
            discount_amount_cents: 9900,
            net_amount_cents: 0,
            status: "redeemed_full",
            payment_method: "coupon_full",
            created_at: "2026-05-05T12:00:00Z",
            paid_at: null,
            notes: null,
          },
        ],
        error: null,
        count: 1,
      }),
    ),
    eq: vi.fn(() => builder),
  };
  return {
    jwtMock: vi.fn(),
    callerClientMock: vi.fn(() => ({
      from: builder.from,
    })),
    queryBuilder: builder,
  };
});

vi.mock("../lib/auth", () => ({
  getCallerJwt: jwtMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: callerClientMock,
}));

import { listCasePredictorOrders } from "../app/_actions/case-predictor/list-orders";

beforeEach(() => {
  jwtMock.mockReset();
  callerClientMock.mockClear();
  queryBuilder.from.mockClear();
  queryBuilder.select.mockClear();
  queryBuilder.order.mockClear();
  queryBuilder.range.mockClear();
  queryBuilder.eq.mockClear();
});

describe("listCasePredictorOrders", () => {
  it("returns FORBIDDEN when no jwt", async () => {
    jwtMock.mockResolvedValue(null);
    const r = await listCasePredictorOrders({ limit: 50, offset: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("FORBIDDEN");
  });

  it("returns ok with rows + total", async () => {
    jwtMock.mockResolvedValue("jwt-1");
    const result = await listCasePredictorOrders({ limit: 50, offset: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.rows[0].status).toBe("redeemed_full");
    }
  });

  it("applies status filter when provided", async () => {
    jwtMock.mockResolvedValue("jwt-1");
    await listCasePredictorOrders({ limit: 10, offset: 0, status: "paid" });
    expect(queryBuilder.eq).toHaveBeenCalledWith("status", "paid");
  });
});
