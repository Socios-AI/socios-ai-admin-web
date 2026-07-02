"use server";

import { revalidatePath } from "next/cache";
import { getCallerClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { setEdgeRateSchema } from "@/lib/validation";

export type SetEdgeRateResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function setEdgeRateAction(input: unknown): Promise<SetEdgeRateResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = setEdgeRateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { childPartnerId, rate, revenueKind } = parsed.data;

  // Chama o RPC com o JWT do admin (não service_role) pra que auth.uid() resolva
  // is_super_admin()=true e o RPC entre no ramo admin (qualquer aresta).
  const sb = getCallerClient({ callerJwt: auth.jwt });
  const { error } = await sb.rpc("set_partner_edge_rate", {
    p_child_partner_id: childPartnerId,
    p_rate: rate,
    p_revenue_kind: revenueKind,
  });

  if (error) {
    if (error.code === "42501") return { ok: false, error: "FORBIDDEN" };
    if (error.code === "23514") {
      const message = /below parent/i.test(error.message)
        ? "A comissão deve ser menor que a do nível acima."
        : "Taxa deve estar entre 0 e 1.";
      return { ok: false, error: "VALIDATION", message };
    }
    return { ok: false, error: "API_ERROR", message: error.message };
  }

  revalidatePath(`/partners/${childPartnerId}`);
  return { ok: true };
}
