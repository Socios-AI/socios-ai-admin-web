import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminClientMock, verifyMock } = vi.hoisted(() => ({
  adminClientMock: vi.fn(),
  verifyMock: vi.fn(),
}));

vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: adminClientMock }));
vi.mock("../../../lib/dropbox-sign-sync", () => ({ verifyDropboxWebhookSignature: verifyMock }));

import { POST } from "../../../app/api/webhooks/dropbox-sign/route";

function buildSb(invitationStatus: string | null) {
  const update = vi.fn().mockResolvedValue({ error: null });
  const audit = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue(
    invitationStatus === null
      ? { data: null, error: null }
      : { data: { id: "inv-1", status: invitationStatus }, error: null },
  );
  return {
    from: vi.fn((table: string) => {
      if (table === "audit_log") return { insert: audit };
      return {
        select: () => ({ eq: () => ({ maybeSingle }) }),
        update: () => ({ eq: () => ({ eq: update }) }),
      };
    }),
    __update: update,
    __audit: audit,
  };
}

async function callRoute(body: object, sig: string | null) {
  const headers = new Headers({ "content-type": "application/json" });
  if (sig !== null) headers.set("x-dropbox-sign-signature", sig);
  const req = new Request("https://admin.sociosai.com/api/webhooks/dropbox-sign", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
  return POST(req);
}

describe("POST /api/webhooks/dropbox-sign", () => {
  beforeEach(() => {
    adminClientMock.mockReset();
    verifyMock.mockReset();
  });

  it("rejects missing signature with 401", async () => {
    const r = await callRoute({ event: { event_type: "x" } }, null);
    expect(r.status).toBe(401);
  });

  it("rejects bad signature with 401", async () => {
    verifyMock.mockReturnValue(false);
    const r = await callRoute({ event: { event_type: "x" } }, "bad");
    expect(r.status).toBe(401);
  });

  it("ignores unrelated event types with 200", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb("sent");
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute({ event: { event_type: "callback_test" } }, "MOCK_SIGNATURE");
    expect(r.status).toBe(200);
    expect(sb.__update).not.toHaveBeenCalled();
  });

  it("processes signature_request_signed: marks invitation contract_signed", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb("sent");
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute(
      {
        event: { event_type: "signature_request_signed" },
        signature_request: { signature_request_id: "MOCK_ENVELOPE_inv-1", metadata: { invitation_id: "inv-1" } },
      },
      "MOCK_SIGNATURE",
    );
    expect(r.status).toBe(200);
    expect(sb.__update).toHaveBeenCalled();
    expect(sb.__audit).toHaveBeenCalled();
  });

  it("idempotent: invitation already contract_signed → 200 no-op", async () => {
    verifyMock.mockReturnValue(true);
    const sb = buildSb("contract_signed");
    adminClientMock.mockReturnValue(sb);
    const r = await callRoute(
      {
        event: { event_type: "signature_request_signed" },
        signature_request: { signature_request_id: "MOCK_ENVELOPE_inv-1", metadata: { invitation_id: "inv-1" } },
      },
      "MOCK_SIGNATURE",
    );
    expect(r.status).toBe(200);
    expect(sb.__update).not.toHaveBeenCalled();
  });

  it("returns 404 when invitation not found", async () => {
    verifyMock.mockReturnValue(true);
    adminClientMock.mockReturnValue(buildSb(null));
    const r = await callRoute(
      {
        event: { event_type: "signature_request_signed" },
        signature_request: { signature_request_id: "MOCK_ENVELOPE_xx", metadata: { invitation_id: "xx" } },
      },
      "MOCK_SIGNATURE",
    );
    expect(r.status).toBe(404);
  });
});
