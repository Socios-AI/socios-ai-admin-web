import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyDropboxWebhookEvent = vi.fn();
const downloadSignedPdf = vi.fn();
vi.mock("../../../lib/dropbox-sign-sync", () => ({
  verifyDropboxWebhookEvent: (...a: unknown[]) => verifyDropboxWebhookEvent(...a),
  downloadSignedPdf: (...a: unknown[]) => downloadSignedPdf(...a),
}));
const storeSignedPdf = vi.fn().mockResolvedValue("signed/c1.pdf");
vi.mock("../../../lib/contract-storage", () => ({ storeSignedPdf: (...a: unknown[]) => storeSignedPdf(...a) }));

const update = vi.fn().mockReturnThis();
const eq = vi.fn().mockReturnThis();
const neq = vi.fn().mockResolvedValue({ error: null });
const select = vi.fn().mockReturnThis();
const maybeSingle = vi.fn();
const insert = vi.fn().mockResolvedValue({ error: null });
const from = vi.fn(() => ({ update, eq, neq, select, maybeSingle, insert }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: () => ({ from }) }));

import { POST } from "../../../app/api/webhooks/dropbox-sign/route";

function req(form: string) {
  return new Request("http://x/api/webhooks/dropbox-sign", { method: "POST", body: form, headers: { "content-type": "application/x-www-form-urlencoded" } });
}
const event = (type: string) => `json=${encodeURIComponent(JSON.stringify({
  event: { event_type: type, event_hash: "h", event_time: "1" },
  signature_request: { signature_request_id: "sr_1", metadata: { contract_id: "c1" } },
}))}`;

beforeEach(() => { vi.clearAllMocks(); });

describe("dropbox-sign webhook live", () => {
  it("rejeita HMAC inválido", async () => {
    verifyDropboxWebhookEvent.mockReturnValue(false);
    const res = await POST(req(event("signature_request_all_signed")));
    expect(res.status).toBe(401);
  });

  it("all_signed: baixa, guarda e marca signed", async () => {
    verifyDropboxWebhookEvent.mockReturnValue(true);
    downloadSignedPdf.mockResolvedValue(Buffer.from("%PDF"));
    maybeSingle.mockResolvedValue({ data: { id: "c1", status: "sent", partner_id: null, partner_invitation_id: "inv-1" }, error: null });
    const res = await POST(req(event("signature_request_all_signed")));
    expect(res.status).toBe(200);
    expect(storeSignedPdf).toHaveBeenCalledWith("c1", expect.any(Buffer));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "signed" }));
    const body = await res.text();
    expect(body).toContain("Hello API Event Received");
  });

  it("evento de teste do provedor responde 200 sem efeito", async () => {
    verifyDropboxWebhookEvent.mockReturnValue(true);
    const res = await POST(req(event("callback_test")));
    expect(res.status).toBe(200);
    expect(storeSignedPdf).not.toHaveBeenCalled();
  });
});
