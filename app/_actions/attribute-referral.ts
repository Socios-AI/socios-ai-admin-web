"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerClaims } from "@/lib/auth";
import { attributeReferralSchema } from "@/lib/validation";

export type AttributeReferralResult =
  | { ok: true; referralId: string }
  | {
      ok: false;
      error: "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "API_ERROR";
      message?: string;
    };

export async function attributeReferralAction(
  input: unknown,
): Promise<AttributeReferralResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const parsed = attributeReferralSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;
  const adminId = claims.sub;

  const sb = getSupabaseAdminClient();

  // Reject if user already has a referral.
  const { data: existing, error: existingErr } = await sb
    .from("referrals")
    .select("source_partner_id")
    .eq("customer_user_id", data.customerUserId)
    .maybeSingle();
  if (existingErr) {
    return { ok: false, error: "API_ERROR", message: existingErr.message };
  }
  if (existing) {
    return {
      ok: false,
      error: "CONFLICT",
      message:
        "Usuário já está atribuído a um licenciado; use 'Transferir' em vez de 'Atribuir'.",
    };
  }

  const { data: row, error: insertErr } = await sb
    .from("referrals")
    .insert({
      source_partner_id: data.sourcePartnerId,
      customer_user_id: data.customerUserId,
      attribution_source: data.attributionSource,
    })
    .select("id")
    .single();
  if (insertErr || !row) {
    return {
      ok: false,
      error: "API_ERROR",
      message: insertErr?.message ?? "insert failed",
    };
  }

  await sb.from("audit_log").insert({
    event_type: "referral.created",
    actor_user_id: adminId,
    target_user_id: data.customerUserId,
    metadata: {
      referral_id: row.id,
      customer_user_id: data.customerUserId,
      source_partner_id: data.sourcePartnerId,
      attribution_source: data.attributionSource,
    },
  });

  revalidatePath(`/partners/${data.sourcePartnerId}`);
  revalidatePath(`/users/${data.customerUserId}`);
  return { ok: true, referralId: row.id };
}
