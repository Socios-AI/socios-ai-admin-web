"use server";

import { getCallerClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { deleteUserSchema } from "@/lib/validation";

export type DeleteUserResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

// Calls the admin_delete_user RPC, which orchestrates the safe deletion
// chain (auth gate, MFA gate, last-super-admin guard, audit row, partner
// termination, then DELETE FROM auth.users with cascades doing the rest).
export async function deleteUserAction(input: {
  userId: string;
  reason: string;
}): Promise<DeleteUserResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };
  const jwt = auth.jwt;

  const parsed = deleteUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  try {
    const sb = getCallerClient({ callerJwt: jwt });
    const { error } = await sb.rpc("admin_delete_user", {
      p_target_user_id: parsed.data.userId,
      p_reason: parsed.data.reason,
    });
    if (error) {
      return {
        ok: false,
        error: "API_ERROR",
        message: error.message ?? "admin_delete_user failed",
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: "API_ERROR",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
