"use server";

import { getCallerClient } from "@socios-ai/auth/admin";
import { getCallerClaims, getCallerJwt } from "@/lib/auth";
import { resetUserMfaSchema } from "@/lib/validation";

export type ResetUserMfaResult =
  | { ok: true; factorsDeleted: number }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

// Calls admin_reset_user_mfa RPC. Returns the count of MFA factors that
// were deleted so the toast can confirm the actual change ("3 fatores
// apagados" vs "0 fatores apagados"). The user will need to re-enroll
// MFA next time they log in (unless MFA enforcement is off for them).
export async function resetUserMfaAction(input: {
  userId: string;
  reason: string;
}): Promise<ResetUserMfaResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const jwt = await getCallerJwt();
  if (!jwt) return { ok: false, error: "FORBIDDEN" };

  const parsed = resetUserMfaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  try {
    const sb = getCallerClient({ callerJwt: jwt });
    const { data, error } = await sb.rpc("admin_reset_user_mfa", {
      p_target_user_id: parsed.data.userId,
      p_reason: parsed.data.reason,
    });
    if (error) {
      return {
        ok: false,
        error: "API_ERROR",
        message: error.message ?? "admin_reset_user_mfa failed",
      };
    }
    return { ok: true, factorsDeleted: typeof data === "number" ? data : 0 };
  } catch (err) {
    return {
      ok: false,
      error: "API_ERROR",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
