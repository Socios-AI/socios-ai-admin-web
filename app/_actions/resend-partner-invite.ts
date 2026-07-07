"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireRegistrarOrAdminAAL2 } from "@/lib/auth";
import { resendPartnerInviteSchema } from "@/lib/validation";
import { partnerOnboardingUrl } from "@/lib/partner-invite-url";
import { partnerInvitationEmail } from "@/lib/email-templates/partner-invitation";
import { sendViaResend } from "@/lib/email-resend";

export type ResendPartnerInviteResult =
  | { ok: true }
  | {
      ok: false;
      error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "INVALID_STATE" | "API_ERROR" | "EMAIL_FAILED";
      message?: string;
    };

const NON_RESENDABLE = new Set(["converted", "revoked", "expired"]);

export async function resendPartnerInviteAction(input: unknown): Promise<ResendPartnerInviteResult> {
  const auth = await requireRegistrarOrAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = resendPartnerInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { invitationId } = parsed.data;
  const sb = getSupabaseAdminClient();

  const { data: row, error: readError } = await sb
    .from("partner_invitations")
    .select("status, email, full_name, invite_token")
    .eq("id", invitationId)
    .maybeSingle();
  if (readError) return { ok: false, error: "API_ERROR", message: readError.message };
  if (!row) return { ok: false, error: "NOT_FOUND" };
  if (NON_RESENDABLE.has(row.status as string)) {
    return { ok: false, error: "INVALID_STATE", message: `status='${row.status}' não pode ser reenviado` };
  }

  // Renova a validade mantendo o mesmo token: links antigos continuam valendo.
  const newExpiresAt = new Date(Date.now() + 30 * 86400_000).toISOString();
  const { error: updateError } = await sb
    .from("partner_invitations")
    .update({ expires_at: newExpiresAt })
    .eq("id", invitationId)
    .eq("status", row.status as string);
  if (updateError) return { ok: false, error: "API_ERROR", message: updateError.message };

  const inviteUrl = partnerOnboardingUrl(row.invite_token as string);
  const email = row.email as string;
  const { subject, html } = partnerInvitationEmail({
    fullName: (row.full_name as string) ?? "",
    inviteUrl,
    expiresAt: newExpiresAt,
  });

  try {
    await sendViaResend({
      to: email,
      subject,
      html,
      // Muda a cada reenvio (nova validade) para o Resend não deduplicar.
      idempotencyKey: `partner-invite-resend-${invitationId}-${new Date(newExpiresAt).getTime()}`,
    });
  } catch (e) {
    return { ok: false, error: "EMAIL_FAILED", message: e instanceof Error ? e.message : "envio falhou" };
  }

  await sb.from("audit_log").insert({
    event_type: "partner_invitation.resent",
    actor_user_id: auth.claims.sub,
    metadata: { invitation_id: invitationId, email, new_expires_at: newExpiresAt },
  });

  revalidatePath("/partners");
  return { ok: true };
}
