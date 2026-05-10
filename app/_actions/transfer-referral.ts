"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { transferReferralSchema } from "@/lib/validation";

export type TransferReferralResult =
  | { ok: true }
  | {
      ok: false;
      error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "API_ERROR";
      message?: string;
    };

export async function transferReferralAction(
  input: unknown,
): Promise<TransferReferralResult> {
  const auth = await requireSuperAdminAAL2();

  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = transferReferralSchema.safeParse(input);
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

  if (ref.source_partner_id === data.toPartnerId) {
    return {
      ok: false,
      error: "VALIDATION",
      message: "Licenciado de destino é o mesmo da origem.",
    };
  }

  // Destination must exist and be active.
  const { data: dest, error: destErr } = await sb
    .from("partners")
    .select("id, status")
    .eq("id", data.toPartnerId)
    .maybeSingle();
  if (destErr) return { ok: false, error: "API_ERROR", message: destErr.message };
  if (!dest || dest.status !== "active") {
    return {
      ok: false,
      error: "CONFLICT",
      message: "Licenciado de destino não está ativo.",
    };
  }

  // Block if attribution is locked.
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
      message: "Atribuição travada por assinatura paga; não é possível transferir.",
    };
  }

  const { error: updErr } = await sb
    .from("referrals")
    .update({
      source_partner_id: data.toPartnerId,
      attribution_source: "admin_assignment",
    })
    .eq("id", data.referralId);
  if (updErr) return { ok: false, error: "API_ERROR", message: updErr.message };

  await sb.from("audit_log").insert({
    event_type: "referral.transferred",
    actor_user_id: adminId,
    target_user_id: ref.customer_user_id,
    metadata: {
      referral_id: ref.id,
      customer_user_id: ref.customer_user_id,
      from_partner_id: ref.source_partner_id,
      to_partner_id: data.toPartnerId,
    },
  });

  revalidatePath(`/partners/${ref.source_partner_id}`);
  revalidatePath(`/partners/${data.toPartnerId}`);
  revalidatePath(`/users/${ref.customer_user_id}`);
  return { ok: true };
}
