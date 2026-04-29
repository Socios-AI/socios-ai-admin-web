"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerClaims } from "@/lib/auth";
import { cancelPartnerInvitationSchema } from "@/lib/validation";

export type CancelPartnerInvitationResult =
  | { ok: true }
  | {
      ok: false;
      error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "INVALID_STATE" | "API_ERROR";
      message?: string;
    };

const NON_REVOCABLE = new Set(["converted", "revoked", "expired"]);

export async function cancelPartnerInvitationAction(
  input: unknown,
): Promise<CancelPartnerInvitationResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const parsed = cancelPartnerInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { invitationId, reason } = parsed.data;
  const sb = getSupabaseAdminClient();

  const { data: row, error: readError } = await sb
    .from("partner_invitations")
    .select("status")
    .eq("id", invitationId)
    .maybeSingle();
  if (readError) return { ok: false, error: "API_ERROR", message: readError.message };
  if (!row) return { ok: false, error: "NOT_FOUND" };
  if (NON_REVOCABLE.has(row.status as string)) {
    return {
      ok: false,
      error: "INVALID_STATE",
      message: `status='${row.status}' não pode ser revogado`,
    };
  }

  const { error: updateError } = await sb
    .from("partner_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("status", row.status);
  if (updateError) return { ok: false, error: "API_ERROR", message: updateError.message };

  await sb.from("audit_log").insert({
    event_type: "partner_invitation.revoked",
    actor_user_id: claims.sub,
    metadata: { invitation_id: invitationId, reason, prior_status: row.status },
  });

  revalidatePath("/partners");
  return { ok: true };
}
