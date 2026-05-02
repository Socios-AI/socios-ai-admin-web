"use server";

import { revalidatePath } from "next/cache";
import { getCallerClient } from "@socios-ai/auth/admin";
import { getCallerJwt, getCallerClaims } from "@/lib/auth";

export type DemoteOwnerResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

// RPC backend tem last-owner guard: se for o último owner ativo,
// retorna erro e o UI mostra como toast.
export async function demoteOwnerAction(input: {
  userId: string;
  reason: string;
}): Promise<DemoteOwnerResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const jwt = await getCallerJwt();
  if (!jwt) return { ok: false, error: "FORBIDDEN" };

  const userId = input.userId?.trim();
  const reason = input.reason?.trim();
  if (!userId) return { ok: false, error: "VALIDATION", message: "userId obrigatório" };
  if (!reason || reason.length < 5) {
    return { ok: false, error: "VALIDATION", message: "Motivo precisa ter pelo menos 5 caracteres" };
  }

  const sb = getCallerClient({ callerJwt: jwt });
  const { error } = await sb.rpc("demote_owner", { p_user_id: userId, p_reason: reason });

  if (error) {
    return { ok: false, error: "API_ERROR", message: error.message };
  }

  revalidatePath(`/users/${userId}`);
  return { ok: true };
}
