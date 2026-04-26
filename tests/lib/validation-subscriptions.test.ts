import { describe, it, expect } from "vitest";
import {
  assignManualSubscriptionSchema,
  cancelSubscriptionSchema,
} from "../../lib/validation";

describe("assignManualSubscriptionSchema", () => {
  const validInput = {
    userId: "11111111-1111-1111-1111-111111111111",
    planId: "22222222-2222-2222-2222-222222222222",
    currentPeriodEnd: "2026-05-25T00:00:00Z",
  };

  it("accepts minimal valid input", () => {
    const result = assignManualSubscriptionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts optional startedAt and notes", () => {
    const result = assignManualSubscriptionSchema.safeParse({
      ...validInput,
      startedAt: "2026-04-25T00:00:00Z",
      notes: "Cortesia 1 mes",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-uuid planId", () => {
    const result = assignManualSubscriptionSchema.safeParse({
      ...validInput,
      planId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null currentPeriodEnd (one_time/custom plans)", () => {
    const result = assignManualSubscriptionSchema.safeParse({
      ...validInput,
      currentPeriodEnd: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects notes longer than 500 chars", () => {
    const result = assignManualSubscriptionSchema.safeParse({
      ...validInput,
      notes: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("cancelSubscriptionSchema", () => {
  it("accepts valid input", () => {
    const result = cancelSubscriptionSchema.safeParse({
      subscriptionId: "33333333-3333-3333-3333-333333333333",
      reason: "Cliente solicitou cancelamento",
    });
    expect(result.success).toBe(true);
  });

  it("rejects reason shorter than 5 chars", () => {
    const result = cancelSubscriptionSchema.safeParse({
      subscriptionId: "33333333-3333-3333-3333-333333333333",
      reason: "no",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid subscriptionId", () => {
    const result = cancelSubscriptionSchema.safeParse({
      subscriptionId: "bad",
      reason: "valid reason",
    });
    expect(result.success).toBe(false);
  });
});
