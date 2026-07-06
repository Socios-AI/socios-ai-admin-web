import { describe, it, expect, vi, beforeEach } from "vitest";

const verifyDropboxWebhookEvent = vi.fn();
const downloadSignedPdf = vi.fn();
vi.mock("../../../lib/dropbox-sign-sync", () => ({
  verifyDropboxWebhookEvent: (...a: unknown[]) => verifyDropboxWebhookEvent(...a),
  downloadSignedPdf: (...a: unknown[]) => downloadSignedPdf(...a),
}));
const storeSignedPdf = vi.fn().mockResolvedValue("signed/c1.pdf");
vi.mock("../../../lib/contract-storage", () => ({ storeSignedPdf: (...a: unknown[]) => storeSignedPdf(...a) }));

// Fake Supabase query builder: every chain method returns `this`, and the
// shared object is thenable so `await` at any point in the chain (whichever
// method happens to be last for that code path) resolves the next queued
// result. Tests populate `resolveQueue` in call order before invoking POST.
type QueryResult = { data: unknown; error: unknown };
let resolveQueue: QueryResult[] = [];
function nextResult(): QueryResult {
  return resolveQueue.length > 0 ? resolveQueue.shift()! : { data: null, error: null };
}
const then = (onFulfilled: (v: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
  Promise.resolve(nextResult()).then(onFulfilled, onRejected);

const update = vi.fn().mockReturnThis();
const eq = vi.fn().mockReturnThis();
const neq = vi.fn().mockReturnThis();
const select = vi.fn().mockReturnThis();
const maybeSingle = vi.fn().mockReturnThis();
const insert = vi.fn().mockReturnThis();
const from = vi.fn(() => ({ update, eq, neq, select, maybeSingle, insert, then }));
vi.mock("@socios-ai/auth/admin", () => ({ getSupabaseAdminClient: () => ({ from }) }));

import { POST } from "../../../app/api/webhooks/dropbox-sign/route";

function req(form: string) {
  return new Request("http://x/api/webhooks/dropbox-sign", { method: "POST", body: form, headers: { "content-type": "application/x-www-form-urlencoded" } });
}
const event = (type: string) => `json=${encodeURIComponent(JSON.stringify({
  event: { event_type: type, event_hash: "h", event_time: "1" },
  signature_request: { signature_request_id: "sr_1", metadata: { contract_id: "c1" } },
}))}`;

beforeEach(() => {
  vi.clearAllMocks();
  resolveQueue = [];
});

describe("dropbox-sign webhook live", () => {
  it("rejeita HMAC inválido", async () => {
    verifyDropboxWebhookEvent.mockReturnValue(false);
    const res = await POST(req(event("signature_request_all_signed")));
    expect(res.status).toBe(401);
  });

  it("all_signed: baixa, guarda e marca signed", async () => {
    verifyDropboxWebhookEvent.mockReturnValue(true);
    downloadSignedPdf.mockResolvedValue(Buffer.from("%PDF"));
    resolveQueue = [
      { data: { id: "c1", status: "sent", partner_id: null }, error: null }, // read
      { data: [{ id: "c1" }], error: null }, // signed-update
      { data: null, error: null }, // audit_log insert
    ];
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

  it("all_signed: contrato já signed é idempotente (não baixa nem grava de novo)", async () => {
    verifyDropboxWebhookEvent.mockReturnValue(true);
    resolveQueue = [{ data: { id: "c1", status: "signed", partner_id: null }, error: null }]; // read
    const res = await POST(req(event("signature_request_all_signed")));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Hello API Event Received");
    expect(downloadSignedPdf).not.toHaveBeenCalled();
    expect(storeSignedPdf).not.toHaveBeenCalled();
  });

  it("signature_request_viewed marca status viewed", async () => {
    verifyDropboxWebhookEvent.mockReturnValue(true);
    resolveQueue = [{ data: null, error: null }];
    const res = await POST(req(event("signature_request_viewed")));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ status: "viewed" });
  });

  it("signature_request_declined marca status declined", async () => {
    verifyDropboxWebhookEvent.mockReturnValue(true);
    resolveQueue = [{ data: null, error: null }];
    const res = await POST(req(event("signature_request_declined")));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ status: "declined" });
  });
});
