import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminClientMock, verifyMock } = vi.hoisted(() => ({
  adminClientMock: vi.fn(),
  verifyMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("../../../lib/stripe-connect-sync", () => ({ verifyStripeWebhookSignature: verifyMock }));

import { POST } from "../../../app/api/webhooks/stripe-connect/route";

type InvitationRow = {
  id: string;
  status: string;
  email: string;
  full_name: string;
  license_amount_usd: number;
  introduced_by_partner_id: string | null;
  custom_commission_pct: number | null;
};

type PartnerRow = { id: string; status: string };

type SbOpts = {
  invitation?: InvitationRow | null;
  authUser?: { id: string; email: string } | null;
  partner?: PartnerRow | null;
};

function buildSb(opts: SbOpts = {}) {
  const invitationUpdate = vi.fn().mockResolvedValue({ error: null });
  const partnerInsert = vi.fn().mockResolvedValue({ error: null });
  const partnerUpdate = vi.fn().mockResolvedValue({ error: null });
  const audit = vi.fn().mockResolvedValue({ error: null });
  const listUsers = vi.fn().mockResolvedValue({
    data: { users: opts.authUser ? [opts.authUser] : [] },
    error: null,
  });

  const invitationMaybeSingle = vi.fn().mockResolvedValue(
    opts.invitation
      ? { data: opts.invitation, error: null }
      : { data: null, error: null },
  );
  const partnerMaybeSingle = vi.fn().mockResolvedValue(
    opts.partner ? { data: opts.partner, error: null } : { data: null, error: null },
  );

  return {
    auth: { admin: { listUsers } },
    from: vi.fn((table: string) => {
      if (table === "audit_log") return { insert: audit };
      if (table === "partner_invitations")
        return {
          select: () => ({ eq: () => ({ maybeSingle: invitationMaybeSingle }) }),
          update: () => ({ eq: () => ({ eq: invitationUpdate }) }),
        };
      if (table === "partners")
        return {
          insert: partnerInsert,
          select: () => ({ eq: () => ({ maybeSingle: partnerMaybeSingle }) }),
          update: () => ({ eq: () => ({ eq: partnerUpdate }) }),
        };
      return {};
    }),
    __invitationUpdate: invitationUpdate,
    __partnerInsert: partnerInsert,
    __partnerUpdate: partnerUpdate,
    __audit: audit,
    __listUsers: listUsers,
  };
}

async function callRoute(body: object, sig: string | null) {
  const headers = new Headers({ "content-type": "application/json" });
  if (sig !== null) headers.set("stripe-signature", sig);
  const req = new Request("https://admin.sociosai.com/api/webhooks/stripe-connect", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
  return POST(req);
}

const baseInvitation: InvitationRow = {
  id: "inv-1",
  status: "contract_signed",
  email: "jane@example.com",
  full_name: "Jane Doe",
  license_amount_usd: 10000,
  introduced_by_partner_id: null,
  custom_commission_pct: null,
};

describe("POST /api/webhooks/stripe-connect", () => {
  beforeEach(() => {
    adminClientMock.mockReset();
    verifyMock.mockReset();
  });

  it("rejects missing signature with 401", async () => {
    const r = await callRoute({ type: "x" }, null);
    expect(r.status).toBe(401);
  });

  it("rejects bad signature with 401", async () => {
    verifyMock.mockReturnValue(false);
    const r = await callRoute({ type: "x" }, "bad");
    expect(r.status).toBe(401);
  });

  it("checkout.session.completed: returns 404 when invitation not found", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb({ invitation: null });
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute(
      {
        type: "checkout.session.completed",
        data: { object: { metadata: { invitation_id: "missing" } } },
      },
      "MOCK_SIGNATURE",
    );
    expect(r.status).toBe(404);
  });

  it("checkout.session.completed: contract_signed without auth.user → invitation paid, no partner, deferred audit", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb({ invitation: baseInvitation, authUser: null });
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute(
      {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_1",
            metadata: { invitation_id: "inv-1" },
            payment_intent: "pi_test_1",
          },
        },
      },
      "MOCK_SIGNATURE",
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.partner_created).toBe(false);
    expect(sb.__invitationUpdate).toHaveBeenCalled();
    expect(sb.__partnerInsert).not.toHaveBeenCalled();
    expect(sb.__audit).toHaveBeenCalledTimes(1);
    const auditArg = sb.__audit.mock.calls[0][0];
    expect(auditArg.event_type).toBe("partner.creation_deferred_no_auth_user");
  });

  it("checkout.session.completed: creates partner when auth.user exists", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb({
      invitation: baseInvitation,
      authUser: { id: "user-uuid", email: "jane@example.com" },
    });
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute(
      {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_1",
            metadata: { invitation_id: "inv-1" },
            payment_intent: "pi_test_1",
            amount_total: 1_000_000,
            currency: "usd",
          },
        },
      },
      "MOCK_SIGNATURE",
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.partner_created).toBe(true);
    expect(sb.__invitationUpdate).toHaveBeenCalled();
    expect(sb.__partnerInsert).toHaveBeenCalled();
    const partnerArg = sb.__partnerInsert.mock.calls[0][0];
    expect(partnerArg.user_id).toBe("user-uuid");
    expect(partnerArg.status).toBe("pending_kyc");
    expect(partnerArg.license_amount_paid_usd).toBe(10000);
    expect(partnerArg.license_payment_intent_id).toBe("pi_test_1");
    expect(partnerArg.metadata.source_invitation_id).toBe("inv-1");
    expect(sb.__audit).toHaveBeenCalledTimes(1);
    const auditArg = sb.__audit.mock.calls[0][0];
    expect(auditArg.event_type).toBe("partner.created_from_invitation");
  });

  it("checkout.session.completed: idempotent when invitation already paid", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb({
      invitation: { ...baseInvitation, status: "paid" },
      authUser: { id: "user-uuid", email: "jane@example.com" },
    });
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute(
      {
        type: "checkout.session.completed",
        data: { object: { metadata: { invitation_id: "inv-1" } } },
      },
      "MOCK_SIGNATURE",
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.idempotent).toBe(true);
    expect(sb.__invitationUpdate).not.toHaveBeenCalled();
    expect(sb.__partnerInsert).not.toHaveBeenCalled();
  });

  it("account.updated: KYC complete + matching partner → activated", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb({ partner: { id: "partner-1", status: "pending_kyc" } });
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute(
      {
        type: "account.updated",
        data: {
          object: {
            id: "acct_123",
            details_submitted: true,
            charges_enabled: true,
          },
        },
      },
      "MOCK_SIGNATURE",
    );
    expect(r.status).toBe(200);
    expect(sb.__partnerUpdate).toHaveBeenCalled();
    expect(sb.__audit).toHaveBeenCalledTimes(1);
    const auditArg = sb.__audit.mock.calls[0][0];
    expect(auditArg.event_type).toBe("partner.activated");
  });

  it("account.updated: idempotent when partner already active", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb({ partner: { id: "partner-1", status: "active" } });
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute(
      {
        type: "account.updated",
        data: {
          object: {
            id: "acct_123",
            details_submitted: true,
            charges_enabled: true,
          },
        },
      },
      "MOCK_SIGNATURE",
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.idempotent).toBe(true);
    expect(sb.__partnerUpdate).not.toHaveBeenCalled();
  });

  it("account.updated: KYC incomplete → 200 ignored", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb({ partner: { id: "partner-1", status: "pending_kyc" } });
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute(
      {
        type: "account.updated",
        data: {
          object: {
            id: "acct_123",
            details_submitted: false,
            charges_enabled: false,
          },
        },
      },
      "MOCK_SIGNATURE",
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ignored).toBe("kyc_incomplete");
    expect(sb.__partnerUpdate).not.toHaveBeenCalled();
  });

  it("ignores unrelated event types with 200", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb();
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute({ type: "invoice.paid", data: { object: {} } }, "MOCK_SIGNATURE");
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ignored).toBe("invoice.paid");
  });
});
