// Plan K.1 · Dropbox Sign integration (mock-aware).
// Mirrors lib/stripe-sync.ts mock pattern. Live SDK wired in K.1 follow-up
// once an account exists.

import { SignatureRequestApi, EventCallbackHelper, EventCallbackRequest } from "@dropbox/sign";

export type CreateEnvelopeInput = {
  invitationId: string;
  candidateName: string;
  candidateEmail: string;
  licenseAmountUsd: number;
};

export type CreateEnvelopeResult = {
  envelopeId: string;
  signingUrl: string;
  mocked: boolean;
};

const PLACEHOLDER_PREFIXES = ["MOCK", "dbx_placeholder", "dbx_test_placeholder"];

function getKey(): string | null {
  const key = process.env.DROPBOX_SIGN_API_KEY;
  if (!key || key.length < 16) return null;
  for (const p of PLACEHOLDER_PREFIXES) {
    if (key.startsWith(p)) return null;
  }
  return key;
}

export function isDropboxSignEnabled(): boolean {
  return getKey() !== null;
}

export async function createEnvelopeForLicense(
  input: CreateEnvelopeInput,
): Promise<CreateEnvelopeResult> {
  if (!isDropboxSignEnabled()) {
    return {
      envelopeId: `MOCK_ENVELOPE_${input.invitationId}`,
      signingUrl: `https://mock-dropbox-sign.local/sign/${input.invitationId}`,
      mocked: true,
    };
  }
  throw new Error(
    "Dropbox Sign live mode not implemented yet. Set DROPBOX_SIGN_API_KEY only after wiring SDK.",
  );
}

// Task 9 stub: destrava a action de aprovação enquanto a implementação live
// (envio real ao Dropbox Sign) chega na Task 11.
export type CreateSignatureRequestInput = {
  contractId: string;
  invitationId: string;
  candidateName: string;
  candidateEmail: string;
  pdf: Buffer;
};
export type CreateSignatureRequestResult = { envelopeId: string; mocked: boolean };

export async function createSignatureRequestForContract(
  input: CreateSignatureRequestInput,
): Promise<CreateSignatureRequestResult> {
  const key = getKey();
  if (!key) {
    return { envelopeId: `MOCK_SR_${input.contractId}`, mocked: true };
  }

  const api = new SignatureRequestApi();
  api.username = key;

  const res = await api.signatureRequestSend({
    title: "Contrato de Licenciamento Sócios AI",
    subject: "Seu contrato de licenciado para assinatura",
    message: "Por favor, revise e assine o contrato de licenciamento.",
    signers: [{ name: input.candidateName, emailAddress: input.candidateEmail, order: 0 }],
    files: [{ value: input.pdf, options: { filename: "contrato.pdf", contentType: "application/pdf" } }],
    metadata: { contract_id: input.contractId, invitation_id: input.invitationId },
    testMode: process.env.DROPBOX_SIGN_TEST_MODE === "true",
  });

  const id = res.body?.signatureRequest?.signatureRequestId;
  if (!id) throw new Error("Dropbox Sign não retornou signature_request_id");
  return { envelopeId: id, mocked: false };
}

// Verificação HMAC do callback (event_hash = HMAC-SHA256(eventTime+eventType, apiKey)).
export function verifyDropboxWebhookEvent(eventJson: unknown): boolean {
  const key = getKey();
  if (!key) {
    // Mock: sem chave live, não há como validar HMAC → fail-closed em prod.
    return false;
  }
  const ev = EventCallbackRequest.init(eventJson as never);
  return EventCallbackHelper.isValid(key, ev);
}

export async function downloadSignedPdf(signatureRequestId: string): Promise<Buffer> {
  const key = getKey();
  if (!key) throw new Error("Dropbox Sign live não configurado");
  const api = new SignatureRequestApi();
  api.username = key;
  // signatureRequestFiles(signatureRequestId, fileType?, options?) → Promise<{ response, body: Buffer }>
  // confirmado em node_modules/@dropbox/sign/types/api/signatureRequestApi.d.ts.
  const res = await api.signatureRequestFiles(signatureRequestId, "pdf");
  const body = res.body as unknown as Buffer | ArrayBuffer;
  return Buffer.isBuffer(body) ? body : Buffer.from(body as ArrayBuffer);
}

export function verifyDropboxWebhookSignature(rawBody: string, signature: string): boolean {
  if (!isDropboxSignEnabled()) {
    // Mock mode: accept only when an env secret is set AND matches. Production
    // does not set this env, so the route stays fail-closed instead of
    // accepting the public "MOCK_SIGNATURE" constant.
    const mockSecret = process.env.DROPBOX_SIGN_WEBHOOK_MOCK_SECRET;
    return Boolean(mockSecret) && signature === mockSecret;
  }
  // Live signature verification will be implemented when SDK is wired.
  // For now, in live mode we conservatively reject all signatures so a
  // misconfigured prod cannot be exploited.
  void rawBody;
  void signature;
  return false;
}
