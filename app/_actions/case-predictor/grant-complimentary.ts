"use server";

import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerClaims } from "@/lib/auth";

export type GrantComplimentaryResult =
  | { ok: true; orderId: string }
  | {
      ok: false;
      error: "FORBIDDEN" | "INVALID_EMAIL" | "REASON_TOO_SHORT" | "USER_NOT_FOUND" | "RPC_ERROR";
      message: string;
    };

export async function grantComplimentaryAction(args: {
  email: string;
  leadId?: string;
  reason: string;
}): Promise<GrantComplimentaryResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) {
    return { ok: false, error: "FORBIDDEN", message: "Apenas super-admin pode liberar análise complimentary" };
  }

  const email = args.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "INVALID_EMAIL", message: "Email inválido" };
  }

  const reason = args.reason?.trim() ?? "";
  if (reason.length < 3) {
    return { ok: false, error: "REASON_TOO_SHORT", message: "Reason deve ter pelo menos 3 caracteres" };
  }

  const sb = getSupabaseAdminClient();

  const { data: user, error: userErr } = await sb
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (userErr || !user) {
    return { ok: false, error: "USER_NOT_FOUND", message: `Usuário ${email} não encontrado` };
  }

  const { data, error } = await sb.rpc("grant_case_predictor_complimentary_order", {
    p_user_id: (user as { id: string }).id,
    p_lead_id: args.leadId ?? null,
    p_reason: reason,
  });

  if (error) {
    return { ok: false, error: "RPC_ERROR", message: error.message };
  }

  return { ok: true, orderId: data as string };
}
