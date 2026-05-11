"use server";

import { demoteFromSuperAdmin } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { demoteUserSchema } from "@/lib/validation";

export type DemoteUserResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function demoteUserAction(input: {
  userId: string;
  reason: string;
}): Promise<DemoteUserResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };
  const jwt = auth.jwt;

  const parsed = demoteUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  try {
    await demoteFromSuperAdmin({
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
