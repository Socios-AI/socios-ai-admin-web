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
  const isOrg = !!data.orgId;

  const sb = getSupabaseAdminClient();

  // 1. Plan must exist and be active
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

  // 2. Org branch: require at least one active membership in (org_id, app_slug)
  if (isOrg) {
    const { count, error: memError } = await sb
      .from("app_memberships")
      .select("id", { count: "exact", head: true })
      .eq("org_id", data.orgId!)
      .eq("app_slug", data.appSlug!)
      .is("revoked_at", null);
    if (memError) {
      return { ok: false, error: "API_ERROR", message: memError.message };
    }
    if (!count || count === 0) {
      return {
        ok: false,
        error: "NOT_FOUND",
        message: "Organização não tem membros ativos neste app",
      };
    }
  }

  // 3. Duplicate check (active sub for the same subject + plan)
  const dupQuery = sb
    .from("subscriptions")
    .select("id")
    .eq("plan_id", data.planId)
    .in("status", [...ACTIVE_STATUSES]);
  const { data: existing } = isOrg
    ? await dupQuery.eq("org_id", data.orgId!).maybeSingle()
    : await dupQuery.eq("user_id", data.userId!).maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "CONFLICT",
      message: isOrg
        ? "Esta organização já tem subscription ativa do plano. Cancele primeiro."
        : "Este usuário já tem subscription ativa do plano. Cancele primeiro.",
    };
  }

  // 4. Insert
  const insertPayload = {
    user_id: isOrg ? null : data.userId!,
    org_id: isOrg ? data.orgId! : null,
    plan_id: data.planId,
    status: "manual" as const,
    external_ref: null as string | null,
    started_at: data.startedAt ?? new Date().toISOString(),
    current_period_end: data.currentPeriodEnd,
    created_by: adminId,
    metadata: data.notes ? { notes: data.notes } : {},
  };

  const { data: inserted, error: insertError } = await sb
    .from("subscriptions")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertError || !inserted) {
    return {
      ok: false,
      error: "API_ERROR",
      message: insertError?.message ?? "insert failed",
    };
  }

  // 5. Audit
  const auditMetadata: Record<string, unknown> = {
    subscription_id: inserted.id,
    plan_id: plan.id,
    plan_slug: plan.slug,
    plan_name: plan.name,
    subject_type: isOrg ? "org" : "user",
    subject_id: isOrg ? data.orgId! : data.userId!,
    current_period_end: data.currentPeriodEnd,
    notes: data.notes ?? null,
  };
  if (isOrg) {
    auditMetadata.org_id = data.orgId!;
    auditMetadata.app_slug = data.appSlug!;
  } else {
    auditMetadata.user_id = data.userId!;
  }

  await sb.from("audit_log").insert({
    event_type: "subscription.assigned_manually",
    actor_user_id: adminId,
    metadata: auditMetadata,
  });

  // 6. Revalidate the right detail page
  if (isOrg) {
    revalidatePath(`/orgs/${data.orgId!}`);
  } else {
    revalidatePath(`/users/${data.userId!}`);
  }
  return { ok: true, subscriptionId: inserted.id };
}
