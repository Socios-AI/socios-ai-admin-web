"use server";

import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  partnerId: z.string().uuid("parceiro inválido"),
  fullName: z.string().trim().min(2, "Nome muito curto").max(120, "Nome muito longo"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  // payload já normalizado por toProfilePayload (os 9 campos de cadastro)
  profile: z.record(z.unknown()),
  // payout opcional (toPayoutPayload → 0 ou 1 método)
  payoutMethods: z.array(z.record(z.unknown())).optional(),
});

export type UpdatePartnerRegistrationResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

// Edição do cadastro de um parceiro pelo admin: nome + email da conta + os 9
// campos de cadastro (partner_profiles). Service-role: partner_profile_upsert
// aceita super_admin/service_role via _partner_can_write; o gate da action é
// requireSuperAdminAAL2.
export async function updatePartnerRegistrationAction(
  input: unknown,
): Promise<UpdatePartnerRegistrationResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { partnerId, fullName, email, profile, payoutMethods } = parsed.data;

  const sb = getSupabaseAdminClient();

  // Resolve o user_id do parceiro.
  const { data: prow, error: pErr } = await sb
    .from("partners")
    .select("user_id")
    .eq("id", partnerId)
    .maybeSingle();
  if (pErr) return { ok: false, error: "API_ERROR", message: pErr.message };
  const userId = (prow?.user_id as string | null) ?? null;
  if (!userId) {
    return { ok: false, error: "VALIDATION", message: "parceiro sem usuário vinculado" };
  }

  // Email: troca no GoTrue (já confirmado) só se mudou.
  const { data: cur } = await sb.from("profiles").select("email").eq("id", userId).maybeSingle();
  const currentEmail = ((cur?.email as string | null) ?? "").toLowerCase();
  if (currentEmail !== email) {
    const { error: uErr } = await sb.auth.admin.updateUserById(userId, {
      email,
      email_confirm: true,
    });
    if (uErr) return { ok: false, error: "API_ERROR", message: `email: ${uErr.message}` };
  }

  // Nome + email em profiles.
  const { error: profErr } = await sb
    .from("profiles")
    .update({ full_name: fullName, email })
    .eq("id", userId);
  if (profErr) return { ok: false, error: "API_ERROR", message: profErr.message };

  // 9 campos de cadastro.
  const { error: upErr } = await sb.rpc("partner_profile_upsert", {
    p_partner_id: partnerId,
    p_payload: profile,
  });
  if (upErr) return { ok: false, error: "API_ERROR", message: upErr.message };

  // Forma(s) de recebimento, se informada(s).
  for (const pm of payoutMethods ?? []) {
    const { error: payErr } = await sb.rpc("partner_payout_upsert", {
      p_partner_id: partnerId,
      p_payload: pm,
    });
    if (payErr) return { ok: false, error: "API_ERROR", message: payErr.message };
  }

  return { ok: true };
}
