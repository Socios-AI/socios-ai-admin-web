import { describe, it, expect, vi, beforeEach } from "vitest";

const { claimsMock, adminClientMock, repriceMock, updateProductMock, syncPlanMock } = vi.hoisted(() => ({
  claimsMock: vi.fn(),
  adminClientMock: vi.fn(),
  repriceMock: vi.fn(),
  updateProductMock: vi.fn(),
  syncPlanMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  getCallerClaims: claimsMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getSupabaseAdminClient: adminClientMock,
}));

vi.mock("../../lib/stripe-sync", () => ({
  repriceStripePlan: repriceMock,
  updateStripeProduct: updateProductMock,
  syncPlanToStripe: syncPlanMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updatePlanAction } from "../../app/_actions/update-plan";

type ExistingPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  billing_period: string;
  price_amount: number | string;
  currency: string;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
};

function buildSb(existing: ExistingPlan | null) {
  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const updateMock = vi.fn(() => ({ eq: updateEq }));

  const selectEq = vi.fn(() => ({
    maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
  }));
  const selectMock = vi.fn(() => ({ eq: selectEq }));

  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  const deleteMock = vi.fn(() => ({ eq: deleteEq }));

  const planAppsInsert = vi.fn().mockResolvedValue({ error: null });

  const fromMock = vi.fn((table: string) => {
    if (table === "plans") return { select: selectMock, update: updateMock };
    if (table === "plan_apps") return { delete: deleteMock, insert: planAppsInsert };
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });

  return { fromMock, auditInsert, updateMock, deleteMock, planAppsInsert, deleteEq };
}

beforeEach(() => {
  claimsMock.mockReset();
  adminClientMock.mockReset();
  repriceMock.mockReset();
  updateProductMock.mockReset();
  syncPlanMock.mockReset();
  updateProductMock.mockResolvedValue({ mocked: true });
});

const EXISTING: ExistingPlan = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "case-pred-pro",
  name: "Pro",
  description: null,
  billing_period: "monthly",
  price_amount: 49,
  currency: "usd",
  stripe_product_id: "prod_mock_pro",
  stripe_price_id: "price_mock_pro",
};

const BASE_INPUT = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Pro",
  description: null,
  billing_period: "monthly" as const,
  price_amount: 49,
  currency: "usd" as const,
  features: [],
  is_visible: true,
  app_slugs: ["case-predictor"],
};

describe("updatePlanAction", () => {
  it("happy path: name-only edit, no price change, audit plan.updated", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const harness = buildSb(EXISTING);
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await updatePlanAction({ ...BASE_INPUT, name: "Pro v2" });

    expect(result).toEqual({ ok: true, price_changed: false, mocked_stripe: true });
    expect(repriceMock).not.toHaveBeenCalled();
    expect(updateProductMock).toHaveBeenCalledWith({
      product_id: "prod_mock_pro",
      name: "Pro v2",
      description: null,
    });
    expect(harness.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "plan.updated" }),
    );
  });

  it("price change triggers reprice and emits plan.stripe_synced event", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    repriceMock.mockResolvedValue({ stripe_price_id: "price_mock_new", mocked: true });
    const harness = buildSb(EXISTING);
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await updatePlanAction({ ...BASE_INPUT, price_amount: 79 });

    expect(result).toEqual({ ok: true, price_changed: true, mocked_stripe: true });
    expect(repriceMock).toHaveBeenCalledWith({
      product_id: "prod_mock_pro",
      old_price_id: "price_mock_pro",
      new_amount: 79,
      currency: "usd",
      billing_period: "monthly",
    });
    expect(harness.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "plan.stripe_synced" }),
    );
  });

  it("switching billing_period to custom detaches stripe_price_id", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const harness = buildSb(EXISTING);
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await updatePlanAction({
      ...BASE_INPUT,
      billing_period: "custom",
    });

    expect(result.ok).toBe(true);
    expect(repriceMock).not.toHaveBeenCalled();
    const updateCall = (harness.updateMock.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(updateCall).toMatchObject({ stripe_price_id: null });
  });

  it("non-super-admin → FORBIDDEN", async () => {
    claimsMock.mockResolvedValue({ super_admin: false, sub: "u-1" });
    const result = await updatePlanAction(BASE_INPUT);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
  });

  it("plan not found → NOT_FOUND", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    const harness = buildSb(null);
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await updatePlanAction(BASE_INPUT);
    expect(result).toEqual({ ok: false, error: "NOT_FOUND" });
  });

  it("plan with no existing product runs full sync (custom → recurring transition)", async () => {
    claimsMock.mockResolvedValue({ super_admin: true, sub: "super-1" });
    syncPlanMock.mockResolvedValue({
      stripe_product_id: "prod_mock_new",
      stripe_price_id: "price_mock_new",
      mocked: true,
    });
    const harness = buildSb({
      ...EXISTING,
      billing_period: "custom",
      stripe_product_id: null,
      stripe_price_id: null,
    });
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await updatePlanAction(BASE_INPUT);

    expect(result.ok).toBe(true);
    expect(syncPlanMock).toHaveBeenCalled();
    expect(updateProductMock).not.toHaveBeenCalled();
  });
});
