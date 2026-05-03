"use server";

import { revalidatePath } from "next/cache";
import { getCallerClient } from "@socios-ai/auth/admin";
import { getCallerJwt, getCallerClaims } from "@/lib/auth";

export type RevokeAffiliateInvitationResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "API_ERROR"; message?: string };

// Revoga um convite de afiliado pendente. Chama RPC SECURITY DEFINER
// porque affiliate_invitations RLS não permite UPDATE direto via authenticated
// (padrão M.3: mutações só via RPC). O audit é gravado dentro da RPC.
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

  const { error } = await sb.rpc("revoke_affiliate_invitation", {
    p_invitation_id: id,
    p_reason: input.reason ?? null,
  });

  if (error) {
    // P0002 = not found (RPC raises com errcode explícito)
    if (error.code === "P0002" || /not found/i.test(error.message)) {
      return { ok: false, error: "NOT_FOUND", message: "Convite não encontrado" };
    }
    return { ok: false, error: "API_ERROR", message: error.message };
  }

  revalidatePath("/affiliates");
  return { ok: true };
}
