"use server";

import { revokeMembership } from "@socios-ai/auth/admin";
import { getCallerClaims, getCallerJwt } from "@/lib/auth";
import { revokeMembershipSchema } from "@/lib/validation";

export type RevokeMembershipResult =
  | { ok: true; revokedAt: string; suggestForceLogout: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function revokeMembershipAction(input: {
  membershipId: string;
  reason: string;
}): Promise<RevokeMembershipResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const jwt = await getCallerJwt();
  if (!jwt) return { ok: false, error: "FORBIDDEN" };

  const parsed = revokeMembershipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  try {
    const result = await revokeMembership({
      membershipId: parsed.data.membershipId,
      reason: parsed.data.reason,
      callerJwt: jwt,
    });
    return { ok: true, revokedAt: result.revokedAt, suggestForceLogout: true };
  } catch (err) {
    return {
      ok: false,
      error: "API_ERROR",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
