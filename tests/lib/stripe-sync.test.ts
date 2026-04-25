import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const stripeProductsCreate = vi.fn();
const stripeProductsUpdate = vi.fn();
const stripePricesCreate = vi.fn();
const stripePricesUpdate = vi.fn();

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      products: { create: stripeProductsCreate, update: stripeProductsUpdate },
      prices: { create: stripePricesCreate, update: stripePricesUpdate },
    })),
  };
});

import {
  syncPlanToStripe,
  repriceStripePlan,
  archiveStripeProduct,
  updateStripeProduct,
  isStripeEnabled,
  __resetClientForTests,
} from "../../lib/stripe-sync";

const ORIGINAL_KEY = process.env.STRIPE_SECRET_KEY;

beforeEach(() => {
  stripeProductsCreate.mockReset();
  stripeProductsUpdate.mockReset();
  stripePricesCreate.mockReset();
  stripePricesUpdate.mockReset();
  __resetClientForTests();
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.STRIPE_SECRET_KEY;
  } else {
    process.env.STRIPE_SECRET_KEY = ORIGINAL_KEY;
  }
  __resetClientForTests();
});

describe("isStripeEnabled", () => {
  it("returns false when key is missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(isStripeEnabled()).toBe(false);
  });

  it("returns false for placeholder values", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder_xxxx";
    expect(isStripeEnabled()).toBe(false);
    process.env.STRIPE_SECRET_KEY = "MOCK_KEY_HERE_12345";
    expect(isStripeEnabled()).toBe(false);
  });

  it("returns true for plausible test key", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_51T3J8aBcDeFgHiJkLmNoPqRsTuVwXyZ";
    expect(isStripeEnabled()).toBe(true);
  });
});

describe("syncPlanToStripe (mock mode)", () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("returns deterministic mock IDs for monthly plan", async () => {
    const result = await syncPlanToStripe({
      slug: "case-pred-pro",
      name: "Case Predictor Pro",
      description: null,
      billing_period: "monthly",
      price_amount: 49,
      currency: "usd",
    });
    expect(result).toEqual({
      stripe_product_id: "prod_mock_case-pred-pro",
      stripe_price_id: "price_mock_case-pred-pro",
      mocked: true,
    });
    expect(stripeProductsCreate).not.toHaveBeenCalled();
  });

  it("returns null IDs for custom billing period (no Stripe sync)", async () => {
    const result = await syncPlanToStripe({
      slug: "enterprise-bespoke",
      name: "Enterprise",
      description: null,
      billing_period: "custom",
      price_amount: 0,
      currency: "usd",
    });
    expect(result).toEqual({ stripe_product_id: null, stripe_price_id: null, mocked: false });
    expect(stripeProductsCreate).not.toHaveBeenCalled();
  });
});

describe("syncPlanToStripe (live SDK)", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_51T3J8aBcDeFgHiJkLmNoPqRsTuVwXyZ";
  });

  it("creates product and recurring price for monthly plan", async () => {
    stripeProductsCreate.mockResolvedValue({ id: "prod_xyz" });
    stripePricesCreate.mockResolvedValue({ id: "price_xyz" });

    const result = await syncPlanToStripe({
      slug: "pro",
      name: "Pro",
      description: "Pro plan",
      billing_period: "monthly",
      price_amount: 49.9,
      currency: "usd",
    });

    expect(stripeProductsCreate).toHaveBeenCalledWith({
      name: "Pro",
      description: "Pro plan",
      metadata: { plan_slug: "pro" },
    });
    expect(stripePricesCreate).toHaveBeenCalledWith({
      product: "prod_xyz",
      unit_amount: 4990,
      currency: "usd",
      recurring: { interval: "month" },
    });
    expect(result).toEqual({ stripe_product_id: "prod_xyz", stripe_price_id: "price_xyz", mocked: false });
  });

  it("creates one-time price (no recurring) for one_time plan", async () => {
    stripeProductsCreate.mockResolvedValue({ id: "prod_one" });
    stripePricesCreate.mockResolvedValue({ id: "price_one" });

    await syncPlanToStripe({
      slug: "license-fee",
      name: "License",
      description: null,
      billing_period: "one_time",
      price_amount: 1500,
      currency: "usd",
    });

    expect(stripePricesCreate).toHaveBeenCalledWith({
      product: "prod_one",
      unit_amount: 150000,
      currency: "usd",
    });
  });

  it("yearly plan uses interval=year", async () => {
    stripeProductsCreate.mockResolvedValue({ id: "prod_y" });
    stripePricesCreate.mockResolvedValue({ id: "price_y" });

    await syncPlanToStripe({
      slug: "annual",
      name: "Annual",
      description: null,
      billing_period: "yearly",
      price_amount: 199,
      currency: "eur",
    });

    expect(stripePricesCreate).toHaveBeenCalledWith({
      product: "prod_y",
      unit_amount: 19900,
      currency: "eur",
      recurring: { interval: "year" },
    });
  });
});

describe("repriceStripePlan", () => {
  it("mock mode skips SDK calls", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const result = await repriceStripePlan({
      product_id: "prod_mock_pro",
      old_price_id: "price_mock_pro",
      new_amount: 99,
      currency: "usd",
      billing_period: "monthly",
    });
    expect(result.mocked).toBe(true);
    expect(stripePricesCreate).not.toHaveBeenCalled();
  });

  it("live mode archives old price and creates new price", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_51T3J8aBcDeFgHiJkLmNoPqRsTuVwXyZ";
    stripePricesUpdate.mockResolvedValue({});
    stripePricesCreate.mockResolvedValue({ id: "price_new" });

    const result = await repriceStripePlan({
      product_id: "prod_live",
      old_price_id: "price_old",
      new_amount: 79,
      currency: "usd",
      billing_period: "monthly",
    });

    expect(stripePricesUpdate).toHaveBeenCalledWith("price_old", { active: false });
    expect(stripePricesCreate).toHaveBeenCalledWith({
      product: "prod_live",
      unit_amount: 7900,
      currency: "usd",
      recurring: { interval: "month" },
    });
    expect(result).toEqual({ stripe_price_id: "price_new", mocked: false });
  });

  it("live mode skips archive when old_price_id is mock", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_51T3J8aBcDeFgHiJkLmNoPqRsTuVwXyZ";
    stripePricesCreate.mockResolvedValue({ id: "price_new" });

    await repriceStripePlan({
      product_id: "prod_live",
      old_price_id: "price_mock_xxx",
      new_amount: 79,
      currency: "usd",
      billing_period: "monthly",
    });

    expect(stripePricesUpdate).not.toHaveBeenCalled();
  });
});

describe("archiveStripeProduct", () => {
  it("no-op for mock product IDs", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_51T3J8aBcDeFgHiJkLmNoPqRsTuVwXyZ";
    const result = await archiveStripeProduct("prod_mock_pro");
    expect(result).toEqual({ mocked: true });
    expect(stripeProductsUpdate).not.toHaveBeenCalled();
  });

  it("calls products.update with active=false in live mode", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_51T3J8aBcDeFgHiJkLmNoPqRsTuVwXyZ";
    stripeProductsUpdate.mockResolvedValue({});
    const result = await archiveStripeProduct("prod_live_xyz");
    expect(stripeProductsUpdate).toHaveBeenCalledWith("prod_live_xyz", { active: false });
    expect(result).toEqual({ mocked: false });
  });
});

describe("updateStripeProduct", () => {
  it("no-op for mock product IDs", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_51T3J8aBcDeFgHiJkLmNoPqRsTuVwXyZ";
    const result = await updateStripeProduct({
      product_id: "prod_mock_x",
      name: "X",
      description: null,
    });
    expect(result.mocked).toBe(true);
    expect(stripeProductsUpdate).not.toHaveBeenCalled();
  });

  it("updates name and description in live mode", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_51T3J8aBcDeFgHiJkLmNoPqRsTuVwXyZ";
    stripeProductsUpdate.mockResolvedValue({});
    await updateStripeProduct({
      product_id: "prod_live",
      name: "New Name",
      description: "New desc",
    });
    expect(stripeProductsUpdate).toHaveBeenCalledWith("prod_live", {
      name: "New Name",
      description: "New desc",
    });
  });
});
