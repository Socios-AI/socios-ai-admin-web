"use server";

import { revalidatePath } from "next/cache";
import { getCallerClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";

export type PromoteToOwnerResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function promoteToOwnerAction(input: {
  userId: string;
  reason: string;
}): Promise<PromoteToOwnerResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };
  const jwt = auth.jwt;

  const userId = input.userId?.trim();
  const reason = input.reason?.trim();
  if (!userId) return { ok: false, error: "VALIDATION", message: "userId obrigatório" };
  if (!reason || reason.length < 5) {
    return { ok: false, error: "VALIDATION", message: "Motivo precisa ter pelo menos 5 caracteres" };
  }

  const sb = getCallerClient({ callerJwt: jwt });
  const { error } = await sb.rpc("promote_to_owner", { p_user_id: userId, p_reason: reason });

  if (error) {
    return { ok: false, error: "API_ERROR", message: error.message };
  }

  revalidatePath(`/users/${userId}`);
  return { ok: true };
}
