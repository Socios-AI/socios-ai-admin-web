"use server";

import { promoteToSuperAdmin } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { promoteUserSchema } from "@/lib/validation";

export type PromoteUserResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function promoteUserAction(input: {
  userId: string;
  reason: string;
}): Promise<PromoteUserResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };
  const jwt = auth.jwt;

  const parsed = promoteUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  try {
    await promoteToSuperAdmin({
      userId: parsed.data.userId,
      reason: parsed.data.reason,
      callerJwt: jwt,
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: "API_ERROR",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
