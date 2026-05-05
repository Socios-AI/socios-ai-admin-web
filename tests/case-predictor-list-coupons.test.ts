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
            id: "batch-1",
            partner_id: "p1",
            total_count: 5,
            discount_pct: 100,
            valid_until: null,
            payment_status: "free_v1",
            created_at: "2026-05-05T12:00:00Z",
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
    callerClientMock: vi.fn(() => ({ from: builder.from })),
    queryBuilder: builder,
  };
});

vi.mock("../lib/auth", () => ({
  getCallerJwt: jwtMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getCallerClient: callerClientMock,
}));

import { listCasePredictorCouponBatches } from "../app/_actions/case-predictor/list-coupon-batches";

beforeEach(() => {
  jwtMock.mockReset();
  callerClientMock.mockClear();
});

describe("listCasePredictorCouponBatches", () => {
  it("returns FORBIDDEN when no jwt", async () => {
    jwtMock.mockResolvedValue(null);
    const r = await listCasePredictorCouponBatches({ limit: 50 });
    expect(r.ok).toBe(false);
  });

  it("returns ok with rows + total", async () => {
    jwtMock.mockResolvedValue("jwt-1");
    const result = await listCasePredictorCouponBatches({ limit: 50 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].discount_pct).toBe(100);
      expect(result.total).toBe(1);
    }
  });
});
