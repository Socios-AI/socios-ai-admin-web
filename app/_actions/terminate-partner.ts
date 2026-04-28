"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerClaims } from "@/lib/auth";
import { terminatePartnerSchema } from "@/lib/validation";

export type TerminatePartnerResult =
  | { ok: true }
  | {
      ok: false;
      error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "INVALID_STATE" | "API_ERROR";
      message?: string;
    };

const NON_TERMINATABLE = new Set(["terminated"]);

export async function terminatePartnerAction(input: unknown): Promise<TerminatePartnerResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const parsed = terminatePartnerSchema.safeParse(input);
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
  if (NON_TERMINATABLE.has(row.status as string)) {
    return {
      ok: false,
      error: "INVALID_STATE",
      message: `já está '${row.status}'`,
    };
  }

  const { error: updateError } = await sb
    .from("partners")
    .update({ status: "terminated", termination_reason: reason })
    .eq("id", partnerId)
    .eq("status", row.status);
  if (updateError) return { ok: false, error: "API_ERROR", message: updateError.message };

  await sb.from("audit_log").insert({
    event_type: "partner.terminated",
    actor_user_id: claims.sub,
    target_user_id: null,
    metadata: { partner_id: partnerId, reason, prior_status: row.status },
  });

  revalidatePath("/partners");
  revalidatePath(`/partners/${partnerId}`);
  return { ok: true };
}
