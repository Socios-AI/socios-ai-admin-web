import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  isDropboxSignEnabled,
  createEnvelopeForLicense,
  verifyDropboxWebhookSignature,
} from "../../lib/dropbox-sign-sync";

describe("dropbox-sign-sync (mock mode)", () => {
  beforeEach(() => {
    delete process.env.DROPBOX_SIGN_API_KEY;
    delete process.env.DROPBOX_SIGN_WEBHOOK_MOCK_SECRET;
  });

  it("isDropboxSignEnabled returns false when key absent", () => {
    expect(isDropboxSignEnabled()).toBe(false);
  });

  it("isDropboxSignEnabled returns false for placeholder", () => {
    process.env.DROPBOX_SIGN_API_KEY = "dbx_placeholder_xxx";
    expect(isDropboxSignEnabled()).toBe(false);
  });

  it("createEnvelopeForLicense returns mock envelope when disabled", async () => {
    const r = await createEnvelopeForLicense({
      invitationId: "11111111-1111-1111-1111-111111111111",
      candidateName: "Jane Doe",
      candidateEmail: "jane@example.com",
      licenseAmountUsd: 10000,
    });
    expect(r.mocked).toBe(true);
    expect(r.envelopeId).toMatch(/^MOCK_ENVELOPE_/);
    expect(r.signingUrl).toContain("mock-dropbox-sign");
  });

  it("verifyDropboxWebhookSignature accepts the configured mock secret in mock mode", () => {
    process.env.DROPBOX_SIGN_WEBHOOK_MOCK_SECRET = "s3cret-mock-value";
    expect(verifyDropboxWebhookSignature("body", "s3cret-mock-value")).toBe(true);
  });

  it("verifyDropboxWebhookSignature rejects the public MOCK_SIGNATURE when no secret is set", () => {
    // Fail-closed in prod: without the env secret, the old public constant is rejected.
    expect(verifyDropboxWebhookSignature("body", "MOCK_SIGNATURE")).toBe(false);
  });

  it("verifyDropboxWebhookSignature rejects non-mock when disabled", () => {
    expect(verifyDropboxWebhookSignature("body", "real_sig_abc")).toBe(false);
  });
});

describe("dropbox-sign-sync (real mode placeholder)", () => {
  beforeEach(() => {
    process.env.DROPBOX_SIGN_API_KEY = "dbx_live_real_key_at_least_16_chars";
  });
  afterEach(() => {
    delete process.env.DROPBOX_SIGN_API_KEY;
  });

  it("isDropboxSignEnabled returns true with valid key", () => {
    expect(isDropboxSignEnabled()).toBe(true);
  });

  it("createEnvelopeForLicense throws when enabled (no SDK installed yet)", async () => {
    await expect(
      createEnvelopeForLicense({
        invitationId: "11111111-1111-1111-1111-111111111111",
        candidateName: "Jane Doe",
        candidateEmail: "jane@example.com",
        licenseAmountUsd: 10000,
      }),
    ).rejects.toThrow(/Dropbox Sign live mode not implemented/i);
  });
});
