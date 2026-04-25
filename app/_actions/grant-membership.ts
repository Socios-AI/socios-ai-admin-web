"use server";

import { grantMembership } from "@socios-ai/auth/admin";
import { getCallerClaims, getCallerJwt } from "@/lib/auth";
import { grantMembershipSchema } from "@/lib/validation";

export type GrantMembershipResult =
  | { ok: true; membershipId: string; suggestForceLogout: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function grantMembershipAction(input: {
  userId: string;
  appSlug: string;
  roleSlug: string;
  orgId?: string;
}): Promise<GrantMembershipResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const jwt = await getCallerJwt();
  if (!jwt) return { ok: false, error: "FORBIDDEN" };

  const parsed = grantMembershipSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  try {
    const result = await grantMembership({
      userId: parsed.data.userId,
      appSlug: parsed.data.appSlug,
      roleSlug: parsed.data.roleSlug,
      orgId: parsed.data.orgId,
      callerJwt: jwt,
    });
    return { ok: true, membershipId: result.membershipId, suggestForceLogout: true };
  } catch (err) {
    return {
      ok: false,
      error: "API_ERROR",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
