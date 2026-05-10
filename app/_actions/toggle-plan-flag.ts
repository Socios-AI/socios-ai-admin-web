"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { togglePlanFlagSchema } from "@/lib/validation";
import { archiveStripeProduct } from "@/lib/stripe-sync";

export type TogglePlanFlagResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "API_ERROR" | "STRIPE_ERROR"; message?: string };

const FLAG_TO_EVENT: Record<"is_active" | "is_visible", { onTrue: string; onFalse: string }> = {
  is_active: { onTrue: "plan.created", onFalse: "plan.deactivated" },
  is_visible: { onTrue: "plan.updated", onFalse: "plan.updated" },
};

export async function togglePlanFlagAction(input: unknown): Promise<TogglePlanFlagResult> {
  const auth = await requireSuperAdminAAL2();

  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = togglePlanFlagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { id, flag, value, reason } = parsed.data;
  const sb = getSupabaseAdminClient();

  const { data: existing, error: existingError } = await sb
    .from("plans")
    .select("id, slug, is_active, is_visible, stripe_product_id")
    .eq("id", id)
    .maybeSingle();
  if (existingError) return { ok: false, error: "API_ERROR", message: existingError.message };
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const { error: updateError } = await sb
    .from("plans")
    .update({ [flag]: value })
    .eq("id", id);
  if (updateError) {
    return { ok: false, error: "API_ERROR", message: updateError.message };
  }

  // When deactivating a plan with a real Stripe product, archive it so no new checkouts succeed.
  if (flag === "is_active" && value === false && existing.stripe_product_id) {
    try {
      await archiveStripeProduct(existing.stripe_product_id);
    } catch (e) {
      // Don't roll back the DB flip; surface as a warning via audit metadata.
      await sb.from("audit_log").insert({
        event_type: "plan.deactivated",
        actor_user_id: claims.sub,
        metadata: {
          plan_id: id,
          slug: existing.slug,
          flag,
          previous: existing[flag],
          next: value,
          reason,
          stripe_archive_error: e instanceof Error ? e.message : String(e),
        },
      });
      revalidatePath("/plans");
      revalidatePath(`/plans/${id}`);
      return { ok: true };
    }
  }

  const eventType = value ? FLAG_TO_EVENT[flag].onTrue : FLAG_TO_EVENT[flag].onFalse;
  await sb.from("audit_log").insert({
    event_type: eventType,
    actor_user_id: claims.sub,
    metadata: {
      plan_id: id,
      slug: existing.slug,
      flag,
      previous: existing[flag],
      next: value,
      reason,
    },
  });

  revalidatePath("/plans");
  revalidatePath(`/plans/${id}`);
  return { ok: true };
}
