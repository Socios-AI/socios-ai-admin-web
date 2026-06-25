"use server";
import { revalidatePath } from "next/cache";
import { getCallerClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { markEntryFeePaidSchema } from "@/lib/validation";

export type MarkEntryFeePaidResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function markEntryFeePaidAction(input: unknown): Promise<MarkEntryFeePaidResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = markEntryFeePaidSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { partnerId } = parsed.data;

  const sb = getCallerClient({ callerJwt: auth.jwt });
  const { error } = await sb.rpc("admin_mark_entry_fee_paid", { p_partner_id: partnerId });
  if (error) {
    if (error.code === "42501") return { ok: false, error: "FORBIDDEN" };
    return { ok: false, error: "API_ERROR", message: error.message };
  }
  revalidatePath(`/partners/${partnerId}`);
  return { ok: true };
}
