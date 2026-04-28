// Plan K.1 · Stripe Connect integration (mock-aware).
// Separate from lib/stripe-sync.ts (Plan G.3) so partner concerns stay isolated.
// Live mode is not implemented yet — uses STRIPE_CONNECT_SECRET_KEY env var,
// distinct from STRIPE_SECRET_KEY used by Plan G/J for product catalog.

export type CreateLicensePaymentLinkInput = {
  invitationId: string;
  amountUsd: number;
  installments: number;
};

export type CreateLicensePaymentLinkResult = {
  paymentLinkUrl: string;
  paymentLinkId: string | null;
  mocked: boolean;
};

export type CreateConnectAccountLinkInput = {
  partnerId: string;
  returnUrl: string;
  refreshUrl: string;
};

export type CreateConnectAccountLinkResult = {
  url: string;
  accountId: string | null;
  mocked: boolean;
};

const PLACEHOLDER_PREFIXES = ["MOCK", "sk_placeholder", "sk_test_placeholder"];

function getKey(): string | null {
  const key = process.env.STRIPE_CONNECT_SECRET_KEY;
  if (!key || key.length < 16) return null;
  for (const p of PLACEHOLDER_PREFIXES) {
    if (key.startsWith(p)) return null;
  }
  return key;
}

export function isStripeConnectEnabled(): boolean {
  return getKey() !== null;
}

export async function createLicensePaymentLink(
  input: CreateLicensePaymentLinkInput,
): Promise<CreateLicensePaymentLinkResult> {
  if (!isStripeConnectEnabled()) {
    return {
      paymentLinkUrl: `https://mock-stripe.local/pay/${input.invitationId}?amount=${input.amountUsd}&installments=${input.installments}`,
      paymentLinkId: null,
      mocked: true,
    };
  }
  throw new Error(
    "Stripe Connect live mode not implemented yet. Wire SDK in K.1 follow-up.",
  );
}

export async function createConnectAccountLink(
  input: CreateConnectAccountLinkInput,
): Promise<CreateConnectAccountLinkResult> {
  if (!isStripeConnectEnabled()) {
    return {
      url: `https://mock-stripe.local/connect/${input.partnerId}?return=${encodeURIComponent(input.returnUrl)}`,
      accountId: null,
      mocked: true,
    };
  }
  throw new Error(
    "Stripe Connect live mode not implemented yet. Wire SDK in K.1 follow-up.",
  );
}

export function verifyStripeWebhookSignature(rawBody: string, signature: string): boolean {
  if (!isStripeConnectEnabled()) {
    return signature === "MOCK_SIGNATURE";
  }
  void rawBody;
  void signature;
  return false;
}
