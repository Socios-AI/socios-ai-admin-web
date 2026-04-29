import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isStripeConnectEnabled,
  createLicensePaymentLink,
  createConnectAccountLink,
  verifyStripeWebhookSignature,
} from "../../lib/stripe-connect-sync";

describe("stripe-connect-sync (mock mode)", () => {
  beforeEach(() => {
    delete process.env.STRIPE_CONNECT_SECRET_KEY;
  });

  it("isStripeConnectEnabled false when key absent", () => {
    expect(isStripeConnectEnabled()).toBe(false);
  });

  it("isStripeConnectEnabled false for placeholder", () => {
    process.env.STRIPE_CONNECT_SECRET_KEY = "sk_placeholder_xxxxxxxxx";
    expect(isStripeConnectEnabled()).toBe(false);
  });

  it("createLicensePaymentLink returns mock link when disabled", async () => {
    const r = await createLicensePaymentLink({
      invitationId: "11111111-1111-1111-1111-111111111111",
      amountUsd: 10000,
      installments: 1,
    });
    expect(r.mocked).toBe(true);
    expect(r.paymentLinkUrl).toMatch(/^https:\/\/mock-stripe\.local\/pay\//);
    expect(r.paymentLinkUrl).toContain("11111111-1111-1111-1111-111111111111");
  });

  it("createLicensePaymentLink encodes installments in mock URL", async () => {
    const r = await createLicensePaymentLink({
      invitationId: "11111111-1111-1111-1111-111111111111",
      amountUsd: 10000,
      installments: 6,
    });
    expect(r.paymentLinkUrl).toContain("installments=6");
  });

  it("createConnectAccountLink returns mock link when disabled", async () => {
    const r = await createConnectAccountLink({
      partnerId: "22222222-2222-2222-2222-222222222222",
      returnUrl: "https://admin.sociosai.com/partners/22222222-2222-2222-2222-222222222222",
      refreshUrl: "https://admin.sociosai.com/partners/new",
    });
    expect(r.mocked).toBe(true);
    expect(r.url).toContain("mock-stripe.local/connect");
    expect(r.accountId).toMatch(/^acct_mock_22222222-2222-2222-2222-222222222222$/);
  });

  it("verifyStripeWebhookSignature accepts MOCK_SIGNATURE in mock mode", () => {
    expect(verifyStripeWebhookSignature("body", "MOCK_SIGNATURE")).toBe(true);
  });

  it("verifyStripeWebhookSignature rejects non-mock when disabled", () => {
    expect(verifyStripeWebhookSignature("body", "t=123,v1=abc")).toBe(false);
  });
});
