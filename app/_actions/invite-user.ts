"use server";

import { createUserWithMembership } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { inviteUserSchema } from "@/lib/validation";

export type InviteUserResult =
  | { ok: true; userId: string; actionLink: string }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function inviteUserAction(input: {
  email: string;
  fullName: string;
  appSlug: string;
  roleSlug: string;
  orgId?: string;
}): Promise<InviteUserResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };
  const jwt = auth.jwt;

  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  try {
    const result = await createUserWithMembership({
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      appSlug: parsed.data.appSlug,
      roleSlug: parsed.data.roleSlug,
      orgId: parsed.data.orgId,
      redirectTo: "https://id.sociosai.com/set-password",
    });
    return { ok: true, userId: result.userId, actionLink: result.actionLink };
  } catch (err) {
    return {
      ok: false,
      error: "API_ERROR",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
