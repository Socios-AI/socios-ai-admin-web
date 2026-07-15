"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { setOnboardingMilestoneSchema } from "@/lib/validation";

export type SetOnboardingMilestoneResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "API_ERROR"; message?: string };

// Marco manual -> coluna timestamptz em public.partners.
const MILESTONE_COLUMN = {
  welcome_kit: "welcome_kit_shipped_at",
  whatsapp_group: "whatsapp_group_joined_at",
  first_meeting: "first_meeting_at",
} as const;

export async function setOnboardingMilestoneAction(
  input: unknown,
): Promise<SetOnboardingMilestoneResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const claims = auth.claims;
  const parsed = setOnboardingMilestoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { partnerId, milestone, done } = parsed.data;
  const column = MILESTONE_COLUMN[milestone];

  const sb = getSupabaseAdminClient();

  const { data: existing, error: readError } = await sb
    .from("partners")
    .select(`id, ${column}`)
    .eq("id", partnerId)
    .maybeSingle();
  if (readError) return { ok: false, error: "API_ERROR", message: readError.message };
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const nextValue = done ? new Date().toISOString() : null;
  const { error: updateError } = await sb
    .from("partners")
    .update({ [column]: nextValue })
    .eq("id", partnerId);
  if (updateError) return { ok: false, error: "API_ERROR", message: updateError.message };

  await sb.from("audit_log").insert({
    event_type: "partner.onboarding_milestone_set",
    actor_user_id: claims.sub,
    target_user_id: null,
    metadata: {
      partner_id: partnerId,
      milestone,
      done,
      previous: (existing as Record<string, unknown>)[column] ?? null,
    },
  });

  revalidatePath("/partners");
  revalidatePath(`/partners/${partnerId}`);
  return { ok: true };
}
