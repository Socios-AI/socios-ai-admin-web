import Stripe from "stripe";

export type BillingPeriod = "monthly" | "yearly" | "one_time" | "custom";
export type PlanCurrency = "usd" | "brl" | "eur";

export type SyncPlanInput = {
  slug: string;
  name: string;
  description: string | null;
  billing_period: BillingPeriod;
  price_amount: number;
  currency: PlanCurrency;
};

export type SyncPlanResult = {
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  mocked: boolean;
};

export type RepriceInput = {
  product_id: string;
  old_price_id: string | null;
  new_amount: number;
  currency: PlanCurrency;
  billing_period: Exclude<BillingPeriod, "custom">;
};

const PLACEHOLDER_PREFIXES = ["MOCK", "sk_placeholder", "sk_test_placeholder"];

let cachedClient: Stripe | null = null;

function getKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (key.length < 16) return null;
  for (const prefix of PLACEHOLDER_PREFIXES) {
    if (key.startsWith(prefix)) return null;
  }
  return key;
}

export function isStripeEnabled(): boolean {
  return getKey() !== null;
}

function getClient(): Stripe {
  const key = getKey();
  if (!key) throw new Error("Stripe is not configured");
  if (!cachedClient) {
    cachedClient = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return cachedClient;
}

function recurringFor(period: BillingPeriod): { interval: "month" | "year" } | undefined {
  if (period === "monthly") return { interval: "month" };
  if (period === "yearly") return { interval: "year" };
  return undefined;
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export async function syncPlanToStripe(input: SyncPlanInput): Promise<SyncPlanResult> {
  if (input.billing_period === "custom") {
    return { stripe_product_id: null, stripe_price_id: null, mocked: false };
  }

  if (!isStripeEnabled()) {
    return {
      stripe_product_id: `prod_mock_${input.slug}`,
      stripe_price_id: `price_mock_${input.slug}`,
      mocked: true,
    };
  }

  const stripe = getClient();
  const product = await stripe.products.create({
    name: input.name,
    description: input.description ?? undefined,
    metadata: { plan_slug: input.slug },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: toCents(input.price_amount),
    currency: input.currency,
    ...(recurringFor(input.billing_period) ? { recurring: recurringFor(input.billing_period) } : {}),
  });

  return { stripe_product_id: product.id, stripe_price_id: price.id, mocked: false };
}

export async function repriceStripePlan(input: RepriceInput): Promise<{ stripe_price_id: string; mocked: boolean }> {
  if (!isStripeEnabled() || input.product_id.startsWith("prod_mock_")) {
    return { stripe_price_id: `price_mock_${input.product_id}_${Date.now()}`, mocked: true };
  }

  const stripe = getClient();
  if (input.old_price_id && !input.old_price_id.startsWith("price_mock_")) {
    await stripe.prices.update(input.old_price_id, { active: false });
  }
  const recurring = recurringFor(input.billing_period);
  const price = await stripe.prices.create({
    product: input.product_id,
    unit_amount: toCents(input.new_amount),
    currency: input.currency,
    ...(recurring ? { recurring } : {}),
  });
  return { stripe_price_id: price.id, mocked: false };
}

export async function archiveStripeProduct(productId: string): Promise<{ mocked: boolean }> {
  if (productId.startsWith("prod_mock_") || !isStripeEnabled()) {
    return { mocked: true };
  }
  const stripe = getClient();
  await stripe.products.update(productId, { active: false });
  return { mocked: false };
}

export async function updateStripeProduct(input: {
  product_id: string;
  name: string;
  description: string | null;
}): Promise<{ mocked: boolean }> {
  if (input.product_id.startsWith("prod_mock_") || !isStripeEnabled()) {
    return { mocked: true };
  }
  const stripe = getClient();
  await stripe.products.update(input.product_id, {
    name: input.name,
    description: input.description ?? undefined,
  });
  return { mocked: false };
}

export function __resetClientForTests(): void {
  cachedClient = null;
}
