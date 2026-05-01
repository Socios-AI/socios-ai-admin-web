import { describe, it, expect } from "vitest";
import { AUDIT_EVENTS, type AuditEventGroup } from "../../lib/audit-events";

const EXPECTED_VALUES = [
  // Apps
  "app.created", "app.updated", "app.activated", "app.deactivated",
  "app.subscriptions_opened", "app.subscriptions_closed",
  // Plans
  "plan.created", "plan.updated", "plan.deactivated", "plan.stripe_synced",
  // Subscriptions
  "subscription.assigned_manually", "subscription.canceled",
  // Memberships (both naming forms — RPCs emit underscore, dotted is alias)
  "membership.granted", "membership.revoked",
  "membership_granted", "membership_revoked",
  // Users (identity RPCs · underscore)
  "user_created", "user_deleted", "force_logout",
  "super_admin_promoted", "super_admin_demoted", "mfa_factors_reset",
  "impersonation_started", "impersonation_ended",
  // Licenciados
  "referral.created", "referral.revoked", "referral.transferred",
  "partner.suspended", "partner.terminated", "partner.commission_updated",
  "partner_invitation.created", "partner_invitation.revoked",
];

const VALID_GROUPS: AuditEventGroup[] = ["Apps", "Planos", "Subscriptions", "Memberships", "Usuários", "Sistema", "Licenciados"];

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
