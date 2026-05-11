"use server";

import { findUserByEmail, type FindUserResult } from "@/lib/data";
import { requireSuperAdminAAL2 } from "@/lib/auth";

export type FindUserForAttributionResult =
  | { ok: true; result: FindUserResult | null }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function findUserForAttributionAction(
  email: string,
): Promise<FindUserForAttributionResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  if (typeof email !== "string" || email.trim().length < 3) {
    return { ok: false, error: "VALIDATION", message: "Email inválido" };
  }

  const jwt = auth.jwt;

  try {
    const result = await findUserByEmail({ callerJwt: jwt, email });
    return { ok: true, result };
  } catch (err) {
    return {
      ok: false,
      error: "API_ERROR",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
