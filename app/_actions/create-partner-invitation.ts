"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerClaims } from "@/lib/auth";
import { createPartnerInvitationSchema } from "@/lib/validation";
import { createEnvelopeForLicense } from "@/lib/dropbox-sign-sync";
import { createLicensePaymentLink } from "@/lib/stripe-connect-sync";

export type CreatePartnerInvitationResult =
  | {
      ok: true;
      id: string;
      invite_url: string;
      mocked_dropbox_sign: boolean;
      mocked_stripe_connect: boolean;
    }
  | {
      ok: false;
      error:
        | "FORBIDDEN"
        | "VALIDATION"
        | "DROPBOX_SIGN_ERROR"
        | "STRIPE_CONNECT_ERROR"
        | "API_ERROR";
      message?: string;
    };

function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

function buildInviteUrl(token: string): string {
  const base = process.env.PARTNERS_WEB_BASE_URL ?? "https://partners.sociosai.com";
  return `${base.replace(/\/$/, "")}/onboarding/${token}`;
}

export async function createPartnerInvitationAction(
  input: unknown,
): Promise<CreatePartnerInvitationResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const parsed = createPartnerInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;

  const inviteToken = generateInviteToken();
  const tempInvitationId = randomUUID();

  let envelope: Awaited<ReturnType<typeof createEnvelopeForLicense>>;
  try {
    envelope = await createEnvelopeForLicense({
      invitationId: tempInvitationId,
      candidateName: data.fullName,
      candidateEmail: data.email,
      licenseAmountUsd: data.licenseAmountUsd,
    });
  } catch (e) {
    return {
      ok: false,
      error: "DROPBOX_SIGN_ERROR",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  let payment: Awaited<ReturnType<typeof createLicensePaymentLink>>;
  try {
    payment = await createLicensePaymentLink({
      invitationId: tempInvitationId,
      amountUsd: data.licenseAmountUsd,
      installments: data.installments,
    });
  } catch (e) {
    return {
      ok: false,
      error: "STRIPE_CONNECT_ERROR",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const sb = getSupabaseAdminClient();

  const expiresAt = new Date(Date.now() + data.expiresInDays * 86400_000).toISOString();

  const { data: inserted, error: insertError } = await sb
    .from("partner_invitations")
    .insert({
      id: tempInvitationId,
      email: data.email,
      full_name: data.fullName,
      introduced_by_partner_id: data.introducedByPartnerId ?? null,
      invite_token: inviteToken,
      contract_envelope_id: envelope.envelopeId,
      payment_link_url: payment.paymentLinkUrl,
      custom_commission_pct: data.customCommissionPct ?? null,
      license_amount_usd: data.licenseAmountUsd,
      installments: data.installments,
      expires_at: expiresAt,
      status: "sent",
    })
    .select("id, invite_token")
    .single();

  if (insertError || !inserted) {
    return { ok: false, error: "API_ERROR", message: insertError?.message ?? "insert failed" };
  }

  await sb.from("audit_log").insert({
    event_type: "partner_invitation.created",
    actor_user_id: claims.sub,
    metadata: {
      invitation_id: inserted.id,
      email: data.email,
      full_name: data.fullName,
      license_amount_usd: data.licenseAmountUsd,
      installments: data.installments,
      introduced_by_partner_id: data.introducedByPartnerId ?? null,
      custom_commission_pct: data.customCommissionPct ?? null,
      mocked_dropbox_sign: envelope.mocked,
      mocked_stripe_connect: payment.mocked,
    },
  });

  revalidatePath("/partners");
  return {
    ok: true,
    id: inserted.id as string,
    invite_url: buildInviteUrl(inserted.invite_token as string),
    mocked_dropbox_sign: envelope.mocked,
    mocked_stripe_connect: payment.mocked,
  };
}
