"use server";

import { revalidatePath } from "next/cache";
import { getCallerClient } from "@socios-ai/auth/admin";
import { getCallerJwt, getCallerClaims } from "@/lib/auth";

export type RevokeAffiliateInvitationResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "API_ERROR"; message?: string };

// Revoga um convite de afiliado pendente (status='sent'). Marca como
// revoked + grava audit. Operação direta (sem RPC dedicado) porque a
// tabela tem RLS adequada e o gate é admin-only.
export async function revokeAffiliateInvitationAction(input: {
  invitationId: string;
  reason?: string;
}): Promise<RevokeAffiliateInvitationResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const jwt = await getCallerJwt();
  if (!jwt) return { ok: false, error: "FORBIDDEN" };

  const id = input.invitationId?.trim();
  if (!id) return { ok: false, error: "VALIDATION", message: "invitationId obrigatório" };

  const sb = getCallerClient({ callerJwt: jwt });

  const { data, error } = await sb
    .from("affiliate_invitations")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("status", "sent")
    .select("id, email")
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") {
      return { ok: false, error: "NOT_FOUND", message: "Convite não está pendente ou não existe" };
    }
    return { ok: false, error: "API_ERROR", message: error?.message ?? "update falhou" };
  }

  await sb.from("audit_log").insert({
    event_type: "affiliate_invitation_revoked",
    actor_user_id: claims.sub,
    metadata: {
      invitation_id: id,
      email: data.email,
      reason: input.reason ?? null,
    },
  });

  revalidatePath("/affiliates");
  return { ok: true };
}
