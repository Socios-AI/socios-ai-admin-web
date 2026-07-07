import { describe, it, expect, vi, beforeEach } from "vitest";

const signatureRequestSend = vi.fn();
class FakeSignatureRequestApi {
  username = "";
  signatureRequestSend = signatureRequestSend;
}
vi.mock("@dropbox/sign", () => ({
  SignatureRequestApi: FakeSignatureRequestApi,
  EventCallbackHelper: {
    isValid: (apiKey: string, ev: { event: { eventHash: string } }) => ev.event.eventHash === "valid-" + apiKey,
  },
  EventCallbackRequest: { init: (d: unknown) => d },
}));

beforeEach(() => { vi.clearAllMocks(); delete process.env.DROPBOX_SIGN_API_KEY; });

describe("dropbox-sign live", () => {
  it("mock quando não há chave", async () => {
    const { createSignatureRequestForContract } = await import("../../lib/dropbox-sign-sync");
    const r = await createSignatureRequestForContract({ contractId: "c1", invitationId: "i1", candidateName: "Ana", candidateEmail: "a@b.com", pdf: Buffer.from("x") });
    expect(r.mocked).toBe(true);
    expect(r.envelopeId).toBe("MOCK_SR_c1");
  });

  it("live: envia e retorna signature_request_id", async () => {
    process.env.DROPBOX_SIGN_API_KEY = "live_key_abcdef0123456789";
    signatureRequestSend.mockResolvedValue({ body: { signatureRequest: { signatureRequestId: "sr_live_1" } } });
    const { createSignatureRequestForContract } = await import("../../lib/dropbox-sign-sync");
    const r = await createSignatureRequestForContract({ contractId: "c1", invitationId: "i1", candidateName: "Ana", candidateEmail: "a@b.com", pdf: Buffer.from("x") });
    expect(r.mocked).toBe(false);
    expect(r.envelopeId).toBe("sr_live_1");
    expect(signatureRequestSend).toHaveBeenCalledWith(expect.objectContaining({
      signers: [expect.objectContaining({ emailAddress: "a@b.com" })],
      metadata: expect.objectContaining({ contract_id: "c1" }),
    }));
  });

  it("verifyDropboxWebhookEvent valida HMAC", async () => {
    process.env.DROPBOX_SIGN_API_KEY = "live_key_abcdef0123456789";
    const { verifyDropboxWebhookEvent } = await import("../../lib/dropbox-sign-sync");
    expect(verifyDropboxWebhookEvent({ event: { eventHash: "valid-live_key_abcdef0123456789" } })).toBe(true);
    expect(verifyDropboxWebhookEvent({ event: { eventHash: "nope" } })).toBe(false);
  });
});
