"use server";

import { revalidatePath } from "next/cache";
import { getCallerClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";

export type SetEntryFeePriceResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function setEntryFeePriceAction(input: {
  role: "licenciado" | "representante";
  amount: number;
  currency: "usd" | "brl";
}): Promise<SetEntryFeePriceResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  if (!["licenciado", "representante"].includes(input.role)) {
    return { ok: false, error: "VALIDATION", message: "Papel inválido." };
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    return { ok: false, error: "VALIDATION", message: "Valor inválido." };
  }
  if (!["usd", "brl"].includes(input.currency)) {
    return { ok: false, error: "VALIDATION", message: "Moeda inválida." };
  }

  const sb = getCallerClient({ callerJwt: auth.jwt });
  const { error } = await sb.rpc("set_entry_fee_price", {
    p_role: input.role,
    p_amount: input.amount,
    p_currency: input.currency,
  });
  if (error) {
    if (error.code === "42501") return { ok: false, error: "FORBIDDEN" };
    return { ok: false, error: "API_ERROR", message: error.message };
  }

  revalidatePath("/products");
  return { ok: true };
}
