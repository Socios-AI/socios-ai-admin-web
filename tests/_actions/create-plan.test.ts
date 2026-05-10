import { describe, it, expect, vi, beforeEach } from "vitest";

const { authMock, adminClientMock, syncPlanMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  adminClientMock: vi.fn(),
  syncPlanMock: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({
  requireSuperAdminAAL2: authMock,
}));

vi.mock("@socios-ai/auth/admin", () => ({
  getSupabaseAdminClient: adminClientMock,
}));

vi.mock("../../lib/stripe-sync", () => ({
  syncPlanToStripe: syncPlanMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createPlanAction } from "../../app/_actions/create-plan";

type SbHarness = {
  fromMock: ReturnType<typeof vi.fn>;
  plansInsert: ReturnType<typeof vi.fn>;
  planAppsInsert: ReturnType<typeof vi.fn>;
  auditInsert: ReturnType<typeof vi.fn>;
  plansDelete: ReturnType<typeof vi.fn>;
};

function buildSb(opts: {
  insertResult?: { data: { id: string } | null; error: { code?: string; message: string } | null };
  planAppsError?: { message: string } | null;
}): SbHarness {
  const insertSelect = vi.fn(() => ({
    single: vi.fn().mockResolvedValue(
      opts.insertResult ?? { data: { id: "plan-1" }, error: null },
    ),
  }));
  const plansInsert = vi.fn(() => ({ select: insertSelect }));

  const planAppsInsert = vi.fn().mockResolvedValue({ error: opts.planAppsError ?? null });
  const auditInsert = vi.fn().mockResolvedValue({ error: null });

  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  const plansDelete = vi.fn(() => ({ eq: deleteEq }));

  const fromMock = vi.fn((table: string) => {
    if (table === "plans") return { insert: plansInsert, delete: plansDelete };
    if (table === "plan_apps") return { insert: planAppsInsert };
    if (table === "audit_log") return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });

  return { fromMock, plansInsert, planAppsInsert, auditInsert, plansDelete };
}

beforeEach(() => {
  authMock.mockReset();
  adminClientMock.mockReset();
  syncPlanMock.mockReset();
});

const VALID_INPUT = {
  slug: "case-pred-pro",
  name: "Case Predictor Pro",
  description: "Pro tier",
  billing_period: "monthly" as const,
  price_amount: 49,
  currency: "usd" as const,
  features: [{ key: "max_users", value: 10 }],
  is_visible: true,
  app_slugs: ["case-predictor"],
};

describe("createPlanAction", () => {
  it("happy path (mock stripe): inserts plan, junction rows, audit", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    syncPlanMock.mockResolvedValue({
      stripe_product_id: "prod_mock_case-pred-pro",
      stripe_price_id: "price_mock_case-pred-pro",
      mocked: true,
    });
    const harness = buildSb({});
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await createPlanAction(VALID_INPUT);

    expect(result).toEqual({
      ok: true,
      id: "plan-1",
      slug: "case-pred-pro",
      mocked_stripe: true,
    });
    expect(syncPlanMock).toHaveBeenCalledOnce();
    expect(harness.planAppsInsert).toHaveBeenCalledWith([
      { plan_id: "plan-1", app_slug: "case-predictor" },
    ]);
    expect(harness.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: "plan.created",
        actor_user_id: "super-1",
      }),
    );
  });

  it("non-super-admin → FORBIDDEN", async () => {
    authMock.mockResolvedValue(null);
    const result = await createPlanAction(VALID_INPUT);
    expect(result).toEqual({ ok: false, error: "FORBIDDEN" });
    expect(syncPlanMock).not.toHaveBeenCalled();
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("invalid slug → VALIDATION", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    const result = await createPlanAction({ ...VALID_INPUT, slug: "Bad Slug" });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
    expect(syncPlanMock).not.toHaveBeenCalled();
  });

  it("empty app_slugs → VALIDATION", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    const result = await createPlanAction({ ...VALID_INPUT, app_slugs: [] });
    expect(result).toMatchObject({ ok: false, error: "VALIDATION" });
  });

  it("stripe sync failure → STRIPE_ERROR", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    syncPlanMock.mockRejectedValue(new Error("Stripe down"));

    const result = await createPlanAction(VALID_INPUT);

    expect(result).toMatchObject({ ok: false, error: "STRIPE_ERROR", message: "Stripe down" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("duplicate slug (23505) → CONFLICT", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    syncPlanMock.mockResolvedValue({
      stripe_product_id: null,
      stripe_price_id: null,
      mocked: true,
    });
    const harness = buildSb({
      insertResult: { data: null, error: { code: "23505", message: "duplicate" } },
    });
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await createPlanAction(VALID_INPUT);

    expect(result).toMatchObject({ ok: false, error: "CONFLICT" });
  });

  it("plan_apps link failure rolls back the plan row", async () => {
    authMock.mockResolvedValue({ claims: { super_admin: true, sub: "super-1", aal: "aal2", exp: 9999999999 }, jwt: "test-jwt" });
    syncPlanMock.mockResolvedValue({
      stripe_product_id: "prod_mock_x",
      stripe_price_id: "price_mock_x",
      mocked: true,
    });
    const harness = buildSb({
      planAppsError: { message: "FK violation" },
    });
    adminClientMock.mockReturnValue({ from: harness.fromMock });

    const result = await createPlanAction(VALID_INPUT);

    expect(result).toMatchObject({ ok: false, error: "API_ERROR" });
    expect(harness.plansDelete).toHaveBeenCalled();
  });
});
