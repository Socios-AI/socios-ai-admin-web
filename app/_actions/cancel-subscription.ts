"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerClaims } from "@/lib/auth";
import { cancelSubscriptionSchema } from "@/lib/validation";

export type CancelSubscriptionResult =
  | { ok: true }
  | {
      ok: false;
      error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "API_ERROR";
      message?: string;
    };

const TERMINAL_STATUSES = new Set(["canceled", "expired"]);

export async function cancelSubscriptionAction(
  input: unknown,
): Promise<CancelSubscriptionResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const parsed = cancelSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;
  const adminId = claims.sub;

  const sb = getSupabaseAdminClient();

  // 1. Read subscription to get user_id (revalidatePath) and validate status
  const { data: sub, error: subError } = await sb
    .from("subscriptions")
    .select("user_id, status, plan_id")
    .eq("id", data.subscriptionId)
    .single();

  if (subError || !sub) {
    return { ok: false, error: "NOT_FOUND", message: "Subscription não encontrada" };
  }
  if (TERMINAL_STATUSES.has(sub.status)) {
    return {
      ok: false,
      error: "CONFLICT",
      message: `Subscription já está ${sub.status === "canceled" ? "cancelada" : "expirada"}.`,
    };
  }

  // 2. Update status + canceled_at (current_period_end preserved as history)
  const { error: updateError } = await sb
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("id", data.subscriptionId);

  if (updateError) {
    return { ok: false, error: "API_ERROR", message: updateError.message };
  }

  // 3. Audit
  await sb.from("audit_log").insert({
    event_type: "subscription.canceled",
    actor_user_id: adminId,
    metadata: {
      subscription_id: data.subscriptionId,
      user_id: sub.user_id,
      plan_id: sub.plan_id,
      reason: data.reason,
    },
  });

  revalidatePath(`/users/${sub.user_id}`);
  return { ok: true };
}
