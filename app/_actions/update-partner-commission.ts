"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { updatePartnerCommissionSchema } from "@/lib/validation";

export type UpdatePartnerCommissionResult =
  | { ok: true }
  | {
      ok: false;
      error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "API_ERROR";
      message?: string;
    };

export async function updatePartnerCommissionAction(
  input: unknown,
): Promise<UpdatePartnerCommissionResult> {
  const auth = await requireSuperAdminAAL2();

  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = updatePartnerCommissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { partnerId, customCommissionPct, reason } = parsed.data;

  const sb = getSupabaseAdminClient();
  const { data: row, error: readError } = await sb
    .from("partners")
    .select("custom_commission_pct")
    .eq("id", partnerId)
    .maybeSingle();
  if (readError) return { ok: false, error: "API_ERROR", message: readError.message };
  if (!row) return { ok: false, error: "NOT_FOUND" };
  const prior = row.custom_commission_pct as number | null;

  const { error: updateError } = await sb
    .from("partners")
    .update({ custom_commission_pct: customCommissionPct })
    .eq("id", partnerId);
  if (updateError) return { ok: false, error: "API_ERROR", message: updateError.message };

  await sb.from("audit_log").insert({
    event_type: "partner.commission_updated",
    actor_user_id: claims.sub,
    target_user_id: null,
    metadata: {
      partner_id: partnerId,
      reason,
      prior_pct: prior,
      new_pct: customCommissionPct,
    },
  });

  revalidatePath(`/partners/${partnerId}`);
  return { ok: true };
}
