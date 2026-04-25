"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerClaims } from "@/lib/auth";
import { assignManualSubscriptionSchema } from "@/lib/validation";

export type AssignManualSubscriptionResult =
  | { ok: true; subscriptionId: string }
  | {
      ok: false;
      error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "API_ERROR";
      message?: string;
    };

const ACTIVE_STATUSES = ["active", "trialing", "past_due", "manual"] as const;

export async function assignManualSubscriptionAction(
  input: unknown,
): Promise<AssignManualSubscriptionResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const parsed = assignManualSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;
  const adminId = claims.sub;

  const sb = getSupabaseAdminClient();

  // 1. Validate plan exists and is_active=true
  const { data: plan, error: planError } = await sb
    .from("plans")
    .select("id, slug, name, is_active")
    .eq("id", data.planId)
    .single();

  if (planError || !plan) {
    return { ok: false, error: "NOT_FOUND", message: "Plano não encontrado" };
  }
  if (!plan.is_active) {
    return {
      ok: false,
      error: "NOT_FOUND",
      message: "Plano foi desativado. Recarregue a página.",
    };
  }

  // 2. Block duplicate active subscription for same (user, plan)
  const { data: existing } = await sb
    .from("subscriptions")
    .select("id")
    .eq("user_id", data.userId)
    .eq("plan_id", data.planId)
    .in("status", [...ACTIVE_STATUSES])
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "CONFLICT",
      message: "Este usuário já tem subscription ativa do plano. Cancele primeiro.",
    };
  }

  // 3. Insert subscription
  const { data: inserted, error: insertError } = await sb
    .from("subscriptions")
    .insert({
      user_id: data.userId,
      plan_id: data.planId,
      status: "manual",
      external_ref: null,
      started_at: data.startedAt ?? new Date().toISOString(),
      current_period_end: data.currentPeriodEnd,
      created_by: adminId,
      metadata: data.notes ? { notes: data.notes } : {},
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      error: "API_ERROR",
      message: insertError?.message ?? "insert failed",
    };
  }

  // 4. Audit log
  await sb.from("audit_log").insert({
    event_type: "subscription.assigned_manually",
    actor_user_id: adminId,
    metadata: {
      subscription_id: inserted.id,
      plan_id: plan.id,
      plan_slug: plan.slug,
      plan_name: plan.name,
      user_id: data.userId,
      current_period_end: data.currentPeriodEnd,
      notes: data.notes ?? null,
    },
  });

  revalidatePath(`/users/${data.userId}`);
  return { ok: true, subscriptionId: inserted.id };
}
