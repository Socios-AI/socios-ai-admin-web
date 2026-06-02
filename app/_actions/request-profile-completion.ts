"use server";

import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { sendViaResend } from "@/lib/email-resend";
import { profileCompletionEmail } from "@/lib/email-templates/profile-completion";

export type RequestCompletionResult =
  | { ok: true; completeUrl: string; emailSent: boolean }
  | { ok: false; error: string };

export async function requestProfileCompletionAction(input: { partnerId: string }): Promise<RequestCompletionResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "forbidden" };

  const sb = getSupabaseAdminClient();
  const { data: token, error } = await sb.rpc("partner_profile_request_completion", { p_partner_id: input.partnerId });
  if (error || !token) return { ok: false, error: error?.message ?? "rpc failed" };

  const base = process.env.PARTNERS_WEB_BASE_URL ?? "https://partners.sociosai.com";
  const completeUrl = `${base.replace(/\/$/, "")}/complete-profile/${token}`;

  // buscar email/nome do parceiro
  const { data: partner } = await sb.from("partners").select("user_id").eq("id", input.partnerId).single();
  let emailSent = false;
  if (partner?.user_id) {
    const { data: profile } = await sb.from("profiles").select("email, full_name").eq("id", partner.user_id).single();
    if (profile?.email) {
      try {
        const { subject, html } = profileCompletionEmail({ recipientName: profile.full_name ?? "", completeUrl });
        await sendViaResend({ to: profile.email, subject, html, idempotencyKey: `complete-${token}` });
        emailSent = true;
      } catch { emailSent = false; }
    }
  }
  return { ok: true, completeUrl, emailSent };
}
