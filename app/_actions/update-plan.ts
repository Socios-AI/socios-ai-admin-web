"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerClaims } from "@/lib/auth";
import { updatePlanSchema, featuresArrayToObject } from "@/lib/validation";
import {
  repriceStripePlan,
  updateStripeProduct,
  syncPlanToStripe,
  type BillingPeriod,
} from "@/lib/stripe-sync";

export type UpdatePlanResult =
  | { ok: true; price_changed: boolean; mocked_stripe: boolean }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "API_ERROR" | "STRIPE_ERROR"; message?: string };

export async function updatePlanAction(input: unknown): Promise<UpdatePlanResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const parsed = updatePlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;
  const sb = getSupabaseAdminClient();

  const { data: existing, error: existingError } = await sb
    .from("plans")
    .select(
      "id, slug, name, description, billing_period, price_amount, currency, stripe_product_id, stripe_price_id",
    )
    .eq("id", data.id)
    .maybeSingle();
  if (existingError) return { ok: false, error: "API_ERROR", message: existingError.message };
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const previousPrice = Number(existing.price_amount);
  const priceChanged =
    previousPrice !== data.price_amount ||
    existing.currency !== data.currency ||
    existing.billing_period !== data.billing_period;

  let stripeProductId: string | null = existing.stripe_product_id;
  let stripePriceId: string | null = existing.stripe_price_id;
  let mocked = false;

  try {
    if (data.billing_period === "custom") {
      // Switching to custom: detach Stripe IDs (no archive — admin can wire later if needed).
      stripePriceId = null;
    } else if (!stripeProductId) {
      // No existing product: full sync (covers transition from custom → recurring).
      const synced = await syncPlanToStripe({
        slug: existing.slug,
        name: data.name,
        description: data.description ?? null,
        billing_period: data.billing_period,
        price_amount: data.price_amount,
        currency: data.currency,
      });
      stripeProductId = synced.stripe_product_id;
      stripePriceId = synced.stripe_price_id;
      mocked = synced.mocked;
    } else {
      // Existing product: update name/description; create new Price if money changed.
      const productUpdate = await updateStripeProduct({
        product_id: stripeProductId,
        name: data.name,
        description: data.description ?? null,
      });
      mocked = mocked || productUpdate.mocked;

      if (priceChanged) {
        const repriced = await repriceStripePlan({
          product_id: stripeProductId,
          old_price_id: stripePriceId,
          new_amount: data.price_amount,
          currency: data.currency,
          billing_period: data.billing_period as Exclude<BillingPeriod, "custom">,
        });
        stripePriceId = repriced.stripe_price_id;
        mocked = mocked || repriced.mocked;
      }
    }
  } catch (e) {
    return { ok: false, error: "STRIPE_ERROR", message: e instanceof Error ? e.message : String(e) };
  }

  const { error: updateError } = await sb
    .from("plans")
    .update({
      name: data.name,
      description: data.description ?? null,
      billing_period: data.billing_period,
      price_amount: data.price_amount,
      currency: data.currency,
      features: featuresArrayToObject(data.features),
      is_visible: data.is_visible,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    })
    .eq("id", data.id);

  if (updateError) {
    return { ok: false, error: "API_ERROR", message: updateError.message };
  }

  // Resync plan_apps junction: delete + insert is the simplest correct path.
  const { error: clearLinksError } = await sb.from("plan_apps").delete().eq("plan_id", data.id);
  if (clearLinksError) {
    return { ok: false, error: "API_ERROR", message: `Falha ao limpar vínculos: ${clearLinksError.message}` };
  }
  if (data.app_slugs.length > 0) {
    const { error: linkError } = await sb
      .from("plan_apps")
      .insert(data.app_slugs.map((app_slug) => ({ plan_id: data.id, app_slug })));
    if (linkError) {
      return { ok: false, error: "API_ERROR", message: `Falha ao vincular apps: ${linkError.message}` };
    }
  }

  await sb.from("audit_log").insert({
    event_type: priceChanged ? "plan.stripe_synced" : "plan.updated",
    actor_user_id: claims.sub,
    metadata: {
      plan_id: data.id,
      slug: existing.slug,
      previous: {
        name: existing.name,
        billing_period: existing.billing_period,
        price_amount: previousPrice,
        currency: existing.currency,
        stripe_price_id: existing.stripe_price_id,
      },
      next: {
        name: data.name,
        billing_period: data.billing_period,
        price_amount: data.price_amount,
        currency: data.currency,
        stripe_price_id: stripePriceId,
      },
      app_slugs: data.app_slugs,
      stripe_mocked: mocked,
    },
  });

  revalidatePath("/plans");
  revalidatePath(`/plans/${data.id}`);
  return { ok: true, price_changed: priceChanged, mocked_stripe: mocked };
}
