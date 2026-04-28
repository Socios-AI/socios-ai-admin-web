import { describe, it, expect } from "vitest";
import {
  nextStatusOnContractSigned,
  nextStatusOnLicensePaid,
  nextStatusOnKycCompleted,
  isTerminalStatus,
  partnerStatusBadgeVariant,
  type PartnerStatus,
} from "../../lib/partners";

describe("partner status transitions", () => {
  it("contract signed: pending_contract → pending_payment", () => {
    expect(nextStatusOnContractSigned("pending_contract")).toBe("pending_payment");
  });

  it("contract signed: idempotent on later states", () => {
    expect(nextStatusOnContractSigned("pending_payment")).toBe("pending_payment");
    expect(nextStatusOnContractSigned("active")).toBe("active");
  });

  it("contract signed: rejects terminal states", () => {
    expect(() => nextStatusOnContractSigned("terminated")).toThrow(/terminal/i);
  });

  it("license paid: pending_payment → pending_kyc", () => {
    expect(nextStatusOnLicensePaid("pending_payment")).toBe("pending_kyc");
  });

  it("license paid: rejects pending_contract (out of order)", () => {
    expect(() => nextStatusOnLicensePaid("pending_contract")).toThrow(/out of order/i);
  });

  it("kyc completed: pending_kyc → active", () => {
    expect(nextStatusOnKycCompleted("pending_kyc")).toBe("active");
  });

  it("kyc completed: rejects pending_contract (out of order)", () => {
    expect(() => nextStatusOnKycCompleted("pending_contract")).toThrow(/out of order/i);
  });

  it("kyc completed: idempotent on active", () => {
    expect(nextStatusOnKycCompleted("active")).toBe("active");
  });

  it("isTerminalStatus matrix", () => {
    expect(isTerminalStatus("terminated")).toBe(true);
    expect(isTerminalStatus("active")).toBe(false);
    expect(isTerminalStatus("suspended")).toBe(false);
    expect(isTerminalStatus("pending_contract")).toBe(false);
  });

  it("partnerStatusBadgeVariant maps each status", () => {
    const all: PartnerStatus[] = [
      "pending_contract", "pending_payment", "pending_kyc",
      "active", "suspended", "terminated",
    ];
    for (const s of all) {
      const v = partnerStatusBadgeVariant(s);
      expect(v).toMatch(/^(default|warning|success|destructive|muted)$/);
    }
    expect(partnerStatusBadgeVariant("active")).toBe("success");
    expect(partnerStatusBadgeVariant("terminated")).toBe("destructive");
  });
});
