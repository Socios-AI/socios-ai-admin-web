"use server";

import { revalidatePath } from "next/cache";
import { getCallerClient, getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerJwt, getCallerClaims } from "@/lib/auth";

export type ActivateAffiliateResult =
  | { ok: true; recoveryEmailSent: boolean }
  | { ok: false; error: "FORBIDDEN" | "API_ERROR" | "RECOVERY_FAIL"; message?: string };

const ID_WEB_BASE = process.env.IDENTITY_WEB_BASE_URL ?? "https://id.sociosai.com";

// Two-step: (1) RPC clears banned_until + sets is_active=true,
// (2) admin API generates a recovery link so the affiliate can set their
// password and finally log in. The recovery link aponta pra
// /affiliate-activate (landing dedicada com copy de boas-vindas), não
// pro /reset genérico. Step 2 failure is non-fatal — admin pode reenviar.
export async function activateAffiliateAction(input: {
  userId: string;
}): Promise<ActivateAffiliateResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const jwt = await getCallerJwt();
  if (!jwt) return { ok: false, error: "FORBIDDEN" };

  const sb = getCallerClient({ callerJwt: jwt });
  const { error: rpcErr } = await sb.rpc("request_affiliate_activation", {
    p_user_id: input.userId,
  });
  if (rpcErr) {
    return { ok: false, error: "API_ERROR", message: rpcErr.message };
  }

  // Disparar email de set-password
  const admin = getSupabaseAdminClient();
  const { data: userRes, error: getErr } = await admin.auth.admin.getUserById(input.userId);
  if (getErr || !userRes?.user?.email) {
    revalidatePath("/affiliates");
    return { ok: true, recoveryEmailSent: false };
  }

  const redirectTo = `${ID_WEB_BASE.replace(/\/$/, "")}/affiliate-activate`;
  const { error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: userRes.user.email,
    options: { redirectTo },
  });

  revalidatePath("/affiliates");
  return { ok: true, recoveryEmailSent: !linkErr };
}
