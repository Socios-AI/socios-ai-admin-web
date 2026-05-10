"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { revokeReferralSchema } from "@/lib/validation";

export type RevokeReferralResult =
  | { ok: true }
  | {
      ok: false;
      error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "API_ERROR";
      message?: string;
    };

export async function revokeReferralAction(
  input: unknown,
): Promise<RevokeReferralResult> {
  const auth = await requireSuperAdminAAL2();

  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = revokeReferralSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;
  const adminId = claims.sub;

  const sb = getSupabaseAdminClient();

  const { data: ref, error: refErr } = await sb
    .from("referrals")
    .select("id, customer_user_id, source_partner_id")
    .eq("id", data.referralId)
    .maybeSingle();
  if (refErr) return { ok: false, error: "API_ERROR", message: refErr.message };
  if (!ref) return { ok: false, error: "NOT_FOUND", message: "Indicação não encontrada" };

  // Block if any subscription has attribution_locked_at set for this user.
  const { data: locked, error: lockedErr } = await sb
    .from("subscriptions")
    .select("id")
    .eq("user_id", ref.customer_user_id)
    .not("attribution_locked_at", "is", null)
    .limit(1)
    .maybeSingle();
  if (lockedErr) return { ok: false, error: "API_ERROR", message: lockedErr.message };
  if (locked) {
    return {
      ok: false,
      error: "CONFLICT",
      message: "Atribuição travada por assinatura paga; não é possível revogar.",
    };
  }

  const { error: delErr } = await sb
    .from("referrals")
    .delete()
    .eq("id", data.referralId);
  if (delErr) return { ok: false, error: "API_ERROR", message: delErr.message };

  await sb.from("audit_log").insert({
    event_type: "referral.revoked",
    actor_user_id: adminId,
    target_user_id: ref.customer_user_id,
    metadata: {
      referral_id: ref.id,
      customer_user_id: ref.customer_user_id,
      source_partner_id: ref.source_partner_id,
    },
  });

  revalidatePath(`/partners/${ref.source_partner_id}`);
  revalidatePath(`/users/${ref.customer_user_id}`);
  return { ok: true };
}
