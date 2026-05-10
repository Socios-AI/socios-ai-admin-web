"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { suspendPartnerSchema } from "@/lib/validation";

export type SuspendPartnerResult =
  | { ok: true }
  | {
      ok: false;
      error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "INVALID_STATE" | "API_ERROR";
      message?: string;
    };

const SUSPENDABLE = new Set(["active"]);

export async function suspendPartnerAction(input: unknown): Promise<SuspendPartnerResult> {
  const auth = await requireSuperAdminAAL2();

  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = suspendPartnerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { partnerId, reason } = parsed.data;

  const sb = getSupabaseAdminClient();
  const { data: row, error: readError } = await sb
    .from("partners")
    .select("status")
    .eq("id", partnerId)
    .maybeSingle();
  if (readError) return { ok: false, error: "API_ERROR", message: readError.message };
  if (!row) return { ok: false, error: "NOT_FOUND" };
  if (!SUSPENDABLE.has(row.status as string)) {
    return {
      ok: false,
      error: "INVALID_STATE",
      message: `status='${row.status}' não é suspensível`,
    };
  }

  const { error: updateError } = await sb
    .from("partners")
    .update({ status: "suspended", suspended_at: new Date().toISOString() })
    .eq("id", partnerId)
    .eq("status", "active");
  if (updateError) return { ok: false, error: "API_ERROR", message: updateError.message };

  await sb.from("audit_log").insert({
    event_type: "partner.suspended",
    actor_user_id: claims.sub,
    target_user_id: null,
    metadata: { partner_id: partnerId, reason, prior_status: row.status },
  });

  revalidatePath("/partners");
  revalidatePath(`/partners/${partnerId}`);
  return { ok: true };
}
