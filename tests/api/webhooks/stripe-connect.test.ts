import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminClientMock, verifyMock, createConnectAccountLinkMock } = vi.hoisted(() => ({
  adminClientMock: vi.fn(),
  verifyMock: vi.fn(),
  createConnectAccountLinkMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("../../../lib/stripe-connect-sync", () => ({
  verifyStripeWebhookSignature: verifyMock,
  createConnectAccountLink: createConnectAccountLinkMock,
}));

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

  // Insert chain: .insert(payload).select("id").single() -> { data: { id }, error }
  // We expose `partnerInsert` as the mock that records the payload so existing
  // assertions on `partnerInsert.mock.calls[0][0]` keep working.
  const partnerInsertSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: "p-1" }, error: null });
  const partnerInsert = vi.fn((_payload: Record<string, unknown>) => ({
    select: () => ({ single: partnerInsertSingle }),
  }));

  // `partners.update(payload)` is called by two flows:
  //   - account.updated (activate): .update(payload).eq("id", id).eq("status", "pending_kyc")
  //   - checkout.session.completed (link account): .update(payload).eq("id", id)
  // We record the payload on `partnerUpdate` and return a chain object whose
  // first .eq() is awaitable (resolves the link-account path) and whose second
  // .eq() resolves the activate path.
  const partnerUpdate = vi.fn((_payload: Record<string, unknown>) => {
    const firstEq = vi.fn((_col: string, _val: unknown) => {
      const thenable: PromiseLike<{ error: null }> & {
        eq: (...args: unknown[]) => Promise<{ error: null }>;
      } = {
        eq: vi.fn().mockResolvedValue({ error: null }),
        then: (onfulfilled, onrejected) =>
          Promise.resolve({ error: null }).then(onfulfilled, onrejected),
      };
      return thenable;
    });
    return { eq: firstEq };
  });

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
          update: partnerUpdate,
        };
      return {};
    }),
    __invitationUpdate: invitationUpdate,
    __partnerInsert: partnerInsert,
    __partnerInsertSingle: partnerInsertSingle,
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
    createConnectAccountLinkMock.mockReset();
    // Default mock: deterministic acct id derived from partnerId, matching
    // the production mock branch in lib/stripe-connect-sync.ts.
    createConnectAccountLinkMock.mockImplementation(
      async (input: { partnerId: string }) => ({
        url: `https://mock-stripe.local/connect/${input.partnerId}`,
        accountId: `acct_mock_${input.partnerId}`,
        mocked: true,
      }),
    );
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
    expect((partnerArg.metadata as { source_invitation_id: string }).source_invitation_id).toBe(
      "inv-1",
    );
    // Connect account id was provisioned and persisted on the new partner row.
    expect(sb.__partnerUpdate).toHaveBeenCalledTimes(1);
    const updateArg = sb.__partnerUpdate.mock.calls[0][0];
    expect(updateArg.stripe_connect_account_id).toBe("acct_mock_p-1");
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
