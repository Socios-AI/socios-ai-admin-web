// Plan K.1 · Dropbox Sign integration (mock-aware).
// Mirrors lib/stripe-sync.ts mock pattern. Live SDK wired in K.1 follow-up
// once an account exists.

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

export function verifyDropboxWebhookSignature(rawBody: string, signature: string): boolean {
  if (!isDropboxSignEnabled()) {
    return signature === "MOCK_SIGNATURE";
  }
  // Live signature verification will be implemented when SDK is wired.
  // For now, in live mode we conservatively reject all signatures so a
  // misconfigured prod cannot be exploited.
  void rawBody;
  void signature;
  return false;
}
