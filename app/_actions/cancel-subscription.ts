"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
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
  const auth = await requireSuperAdminAAL2();

  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = cancelSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;
  const adminId = claims.sub;

  const sb = getSupabaseAdminClient();

  // 1. Read subscription to get user_id/org_id (revalidatePath) and validate status
  const { data: sub, error: subError } = await sb
    .from("subscriptions")
    .select("user_id, org_id, status, plan_id")
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

  // Fetch plan details for audit enrichment
  const { data: plan } = await sb
    .from("plans")
    .select("slug, name")
    .eq("id", sub.plan_id)
    .single();

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
  const isOrg = sub.org_id !== null && sub.org_id !== undefined;
  const subjectId = isOrg ? sub.org_id : sub.user_id;

  const auditMetadata: Record<string, unknown> = {
    subscription_id: data.subscriptionId,
    plan_id: sub.plan_id,
    plan_slug: plan?.slug ?? null,
    plan_name: plan?.name ?? null,
    subject_type: isOrg ? "org" : "user",
    subject_id: subjectId,
    reason: data.reason,
  };
  if (isOrg) {
    auditMetadata.org_id = sub.org_id;
  } else {
    auditMetadata.user_id = sub.user_id;
  }

  await sb.from("audit_log").insert({
    event_type: "subscription.canceled",
    actor_user_id: adminId,
    metadata: auditMetadata,
  });

  if (isOrg) {
    revalidatePath(`/orgs/${sub.org_id!}`);
  } else {
    revalidatePath(`/users/${sub.user_id}`);
  }
  return { ok: true };
}
