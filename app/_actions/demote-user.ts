"use server";

import { demoteFromSuperAdmin } from "@socios-ai/auth/admin";
import { getCallerClaims, getCallerJwt } from "@/lib/auth";
import { demoteUserSchema } from "@/lib/validation";

export type DemoteUserResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function demoteUserAction(input: {
  userId: string;
  reason: string;
}): Promise<DemoteUserResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const jwt = await getCallerJwt();
  if (!jwt) return { ok: false, error: "FORBIDDEN" };

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
