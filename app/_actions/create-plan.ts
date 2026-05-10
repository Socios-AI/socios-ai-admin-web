"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { createPlanSchema, featuresArrayToObject } from "@/lib/validation";
import { syncPlanToStripe } from "@/lib/stripe-sync";

export type CreatePlanResult =
  | { ok: true; id: string; slug: string; mocked_stripe: boolean }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "API_ERROR" | "STRIPE_ERROR"; message?: string };

export async function createPlanAction(input: unknown): Promise<CreatePlanResult> {
  const auth = await requireSuperAdminAAL2();

  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;

  let stripeIds: { stripe_product_id: string | null; stripe_price_id: string | null; mocked: boolean };
  try {
    stripeIds = await syncPlanToStripe({
      slug: data.slug,
      name: data.name,
      description: data.description ?? null,
      billing_period: data.billing_period,
      price_amount: data.price_amount,
      currency: data.currency,
    });
  } catch (e) {
    return { ok: false, error: "STRIPE_ERROR", message: e instanceof Error ? e.message : String(e) };
  }

  const sb = getSupabaseAdminClient();

  const { data: inserted, error: insertError } = await sb
    .from("plans")
    .insert({
      slug: data.slug,
      name: data.name,
      description: data.description ?? null,
      billing_period: data.billing_period,
      price_amount: data.price_amount,
      currency: data.currency,
      features: featuresArrayToObject(data.features),
      is_active: true,
      is_visible: data.is_visible,
      stripe_product_id: stripeIds.stripe_product_id,
      stripe_price_id: stripeIds.stripe_price_id,
      created_by: claims.sub,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return { ok: false, error: "CONFLICT", message: "Slug já existe" };
    }
    return { ok: false, error: "API_ERROR", message: insertError?.message ?? "insert failed" };
  }

  const planId = inserted.id as string;

  if (data.app_slugs.length > 0) {
    const { error: linkError } = await sb
      .from("plan_apps")
      .insert(data.app_slugs.map((app_slug) => ({ plan_id: planId, app_slug })));
    if (linkError) {
      // Rollback: best-effort delete the plan we just created.
      await sb.from("plans").delete().eq("id", planId);
      return { ok: false, error: "API_ERROR", message: `Falha ao vincular apps: ${linkError.message}` };
    }
  }

  await sb.from("audit_log").insert({
    event_type: stripeIds.mocked ? "plan.created" : "plan.stripe_synced",
    actor_user_id: claims.sub,
    metadata: {
      plan_id: planId,
      slug: data.slug,
      name: data.name,
      billing_period: data.billing_period,
      price_amount: data.price_amount,
      currency: data.currency,
      app_slugs: data.app_slugs,
      stripe_product_id: stripeIds.stripe_product_id,
      stripe_price_id: stripeIds.stripe_price_id,
      stripe_mocked: stripeIds.mocked,
    },
  });

  revalidatePath("/plans");
  return { ok: true, id: planId, slug: data.slug, mocked_stripe: stripeIds.mocked };
}
