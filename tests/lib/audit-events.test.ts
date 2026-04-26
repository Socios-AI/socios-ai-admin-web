import { describe, it, expect } from "vitest";
import { AUDIT_EVENTS, type AuditEventGroup } from "../../lib/audit-events";

const EXPECTED_VALUES = [
  "app.created", "app.updated", "app.activated", "app.deactivated",
  "app.subscriptions_opened", "app.subscriptions_closed",
  "plan.created", "plan.updated", "plan.deactivated", "plan.stripe_synced",
  "subscription.assigned_manually", "subscription.canceled",
  "membership.granted", "membership.revoked",
];

const VALID_GROUPS: AuditEventGroup[] = ["Apps", "Planos", "Subscriptions", "Memberships", "Sistema"];

describe("AUDIT_EVENTS catalog", () => {
  it("contains exactly the known event_types emitted by admin-web actions", () => {
    const values = AUDIT_EVENTS.map((e) => e.value).sort();
    expect(values).toEqual([...EXPECTED_VALUES].sort());
  });

  it("every entry has non-empty label", () => {
    for (const e of AUDIT_EVENTS) {
      expect(e.label.length).toBeGreaterThan(0);
    }
  });

  it("every entry has a valid group", () => {
    for (const e of AUDIT_EVENTS) {
      expect(VALID_GROUPS).toContain(e.group);
    }
  });

  it("each value is unique", () => {
    const values = AUDIT_EVENTS.map((e) => e.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
