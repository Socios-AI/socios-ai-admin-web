"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { toggleAppFlagSchema } from "@/lib/validation";

export type ToggleAppFlagResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "API_ERROR"; message?: string };

const FLAG_TO_EVENT: Record<"active" | "accepts_new_subscriptions", { onTrue: string; onFalse: string }> = {
  active: { onTrue: "app.activated", onFalse: "app.deactivated" },
  accepts_new_subscriptions: {
    onTrue: "app.subscriptions_opened",
    onFalse: "app.subscriptions_closed",
  },
};

export async function toggleAppFlagAction(input: unknown): Promise<ToggleAppFlagResult> {
  const auth = await requireSuperAdminAAL2();

  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = toggleAppFlagSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  const sb = getSupabaseAdminClient();
  const { slug, flag, value, reason } = parsed.data;

  const { data: existing, error: existingError } = await sb
    .from("apps")
    .select("slug, active, accepts_new_subscriptions")
    .eq("slug", slug)
    .maybeSingle();
  if (existingError) return { ok: false, error: "API_ERROR", message: existingError.message };
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const { error: updateError } = await sb
    .from("apps")
    .update({ [flag]: value })
    .eq("slug", slug);

  if (updateError) {
    return { ok: false, error: "API_ERROR", message: updateError.message };
  }

  const eventType = value ? FLAG_TO_EVENT[flag].onTrue : FLAG_TO_EVENT[flag].onFalse;
  await sb.from("audit_log").insert({
    event_type: eventType,
    actor_user_id: claims.sub,
    app_slug: slug,
    metadata: {
      flag,
      previous: existing[flag],
      next: value,
      reason,
    },
  });

  revalidatePath("/apps");
  revalidatePath(`/apps/${slug}`);
  return { ok: true };
}
