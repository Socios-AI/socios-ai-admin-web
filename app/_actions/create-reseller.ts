"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { getCallerClaims } from "@/lib/auth";

export type CreateResellerResult =
  | { ok: true; userId: string; partnerId: string; recoveryEmailSent: boolean }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

// Diferente do licensee, reseller é criado direto pelo admin (sem fluxo
// invitation/contrato/pagamento). O admin cria auth.users + partner row
// (tier=reseller, status=active) e a plataforma dispara recovery email pra
// o usuário definir senha. customCommissionPct é opcional; comissão real
// (valor fixo) será gerenciada via commission_config (Plan K.4 quando vier).
export async function createResellerAction(input: {
  email: string;
  fullName: string;
  customCommissionPct?: number;
}): Promise<CreateResellerResult> {
  const claims = await getCallerClaims();
  if (!claims?.super_admin) return { ok: false, error: "FORBIDDEN" };

  const email = input.email?.trim().toLowerCase();
  const fullName = input.fullName?.trim();
  if (!email || !email.includes("@") || !fullName) {
    return { ok: false, error: "VALIDATION", message: "email e nome são obrigatórios" };
  }

  if (
    input.customCommissionPct != null &&
    (input.customCommissionPct < 0 || input.customCommissionPct > 1)
  ) {
    return { ok: false, error: "VALIDATION", message: "comissão deve estar entre 0 e 1" };
  }

  const sb = getSupabaseAdminClient();

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    return {
      ok: false,
      error: "API_ERROR",
      message: createErr?.message ?? "createUser falhou",
    };
  }

  const userId = created.user.id;

  const { data: partner, error: partnerErr } = await sb
    .from("partners")
    .insert({
      user_id: userId,
      status: "active",
      tier: "reseller",
      activated_at: new Date().toISOString(),
      custom_commission_pct: input.customCommissionPct ?? null,
    })
    .select("id")
    .single();

  if (partnerErr || !partner) {
    await sb.auth.admin.deleteUser(userId).catch(() => undefined);
    return { ok: false, error: "API_ERROR", message: partnerErr?.message ?? "insert partner falhou" };
  }

  await sb.from("audit_log").insert({
    event_type: "reseller_created",
    actor_user_id: claims.sub,
    target_user_id: userId,
    metadata: { partner_id: partner.id, email },
  });

  const { error: linkErr } = await sb.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  revalidatePath("/partners");
  return {
    ok: true,
    userId,
    partnerId: partner.id,
    recoveryEmailSent: !linkErr,
  };
}
