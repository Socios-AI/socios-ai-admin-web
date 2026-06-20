"use server";

import { createUserWithMembership, getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireSuperAdminAAL2 } from "@/lib/auth";
import { inviteUserSchema } from "@/lib/validation";

export type InviteUserResult =
  | { ok: true; userId: string; actionLink: string }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function inviteUserAction(input: {
  email: string;
  fullName: string;
  appSlug: string;
  roleSlug: string;
  orgId?: string;
  introducedByPartnerId?: string;
}): Promise<InviteUserResult> {
  const auth = await requireSuperAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }

  let userId: string;
  let actionLink: string;
  try {
    const result = await createUserWithMembership({
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      appSlug: parsed.data.appSlug,
      roleSlug: parsed.data.roleSlug,
      orgId: parsed.data.orgId,
      redirectTo: "https://id.sociosai.com/set-password",
    });
    userId = result.userId;
    actionLink = result.actionLink;
  } catch (err) {
    return {
      ok: false,
      error: "API_ERROR",
      message: err instanceof Error ? err.message : String(err),
    };
  }

  // Atribuição opcional: registra quem indicou esse usuário para que a comissão
  // flua quando ele pagar. Nível de usuário (attributions.signup_capture) cobre
  // o pagamento individual; se um org foi informado, carimba também o introducer
  // do org (sem sobrescrever) para cobrir pagamento via tenant.
  if (parsed.data.introducedByPartnerId) {
    const sb = getSupabaseAdminClient();
    const partnerId = parsed.data.introducedByPartnerId;

    const { data: partner, error: partnerErr } = await sb
      .from("partners")
      .select("id, user_id, tier, status")
      .eq("id", partnerId)
      .maybeSingle();
    if (partnerErr) {
      return { ok: false, error: "API_ERROR", message: partnerErr.message };
    }
    if (!partner || partner.status !== "active") {
      return { ok: false, error: "VALIDATION", message: "Parceiro indicante inválido ou inativo" };
    }

    // Não sobrescreve atribuição existente do usuário (a captura é única por cliente).
    const { data: existing, error: existingErr } = await sb
      .from("attributions")
      .select("id")
      .eq("customer_user_id", userId)
      .eq("kind", "signup_capture")
      .maybeSingle();
    if (existingErr) {
      return { ok: false, error: "API_ERROR", message: existingErr.message };
    }

    if (!existing) {
      const sourceTier =
        partner.tier === "licensee" || partner.tier === "reseller" ? partner.tier : "unknown";
      const { error: attrErr } = await sb.from("attributions").insert({
        customer_user_id: userId,
        source_user_id: partner.user_id,
        source_tier: sourceTier,
        source_code: partner.id,
        kind: "signup_capture",
        attribution_method: "admin_assignment",
      });
      if (attrErr) {
        return { ok: false, error: "API_ERROR", message: attrErr.message };
      }
    }

    // Se o convite escopa um org e ele ainda não tem introducer, carimba (sem sobrescrever).
    if (parsed.data.orgId) {
      await sb
        .from("orgs")
        .update({ introduced_by_partner_id: partner.id })
        .eq("id", parsed.data.orgId)
        .is("introduced_by_partner_id", null);
    }
  }

  return { ok: true, userId, actionLink };
}
