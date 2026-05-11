"use server";

import { grantMembership } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
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
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };
  const jwt = auth.jwt;

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
