"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireRegistrarOrAdminAAL2 } from "@/lib/auth";
import { createPartnerInviteSchema } from "@/lib/validation";
import { generateAndStoreContract } from "@/lib/contract-generator/generate-and-store";
import { TEMPLATE_VERSION } from "@/lib/contract-generator/build-payload";
import { partnerOnboardingUrl } from "@/lib/partner-invite-url";

export type CreatePartnerInviteResult =
  | { ok: true; invite_url: string }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function createPartnerInviteAction(input: unknown): Promise<CreatePartnerInviteResult> {
  const auth = await requireRegistrarOrAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = createPartnerInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;
  const expiresInDays = data.expiresInDays ?? 30;

  const sb = getSupabaseAdminClient();

  const commissionPct = data.commissionPct ?? null;

  // Valida o upline (se informado): precisa existir e estar ativo.
  if (data.introducedByPartnerId) {
    const { data: up, error: upErr } = await sb
      .from("partners")
      .select("id, status")
      .eq("id", data.introducedByPartnerId)
      .maybeSingle();
    if (upErr) return { ok: false, error: "API_ERROR", message: upErr.message };
    if (!up || up.status !== "active") {
      return { ok: false, error: "VALIDATION", message: "Upline inválido ou inativo" };
    }

    // filho < pai: a comissão negociada não pode ser >= a taxa ativa do upline.
    if (commissionPct !== null) {
      const { data: uplineRate } = await sb
        .from("partner_edge_rates")
        .select("rate_pct")
        .eq("child_partner_id", data.introducedByPartnerId)
        .eq("revenue_kind", "subscription")
        .is("effective_to", null)
        .maybeSingle();
      if (uplineRate && commissionPct >= Number(uplineRate.rate_pct)) {
        return {
          ok: false,
          error: "VALIDATION",
          message: `Comissão (${commissionPct}) deve ser menor que a do upline (${uplineRate.rate_pct}).`,
        };
      }
    }
  }

  const inviteToken = randomBytes(24).toString("base64url");
  const invitationId = randomUUID();
  const tierTarget = data.targetRole === "licenciado" ? "licensee" : "reseller";
  const expiresAt = new Date(Date.now() + expiresInDays * 86400_000).toISOString();

  const { error: insErr } = await sb.from("partner_invitations").insert({
    id: invitationId,
    email: data.email,
    full_name: data.fullName,
    target_role: data.targetRole,
    tier_target: tierTarget,
    introduced_by_partner_id: data.introducedByPartnerId ?? null,
    invite_token: inviteToken,
    expires_at: expiresAt,
    status: "sent",
    custom_commission_pct: commissionPct,
  });
  if (insErr) {
    if (insErr.code === "23505") return { ok: false, error: "VALIDATION", message: insErr.message };
    return { ok: false, error: "API_ERROR", message: insErr.message };
  }

  let prefillPersistError: string | null = null;

  // Licenciado com dados do contrato: gera o PDF draft e grava partner_contracts.
  if (data.targetRole === "licenciado" && data.contractProfile) {
    const cp = data.contractProfile;
    const contractId = randomUUID();
    const effectiveLicenseUsd = data.licenseAmountUsd ?? 15000;
    const gen = await generateAndStoreContract({
      contractId,
      input: {
        invitationId,
        counterparty: {
          display_name: data.fullName,
          email: data.email,
          person_type: cp.person_type,
          country: cp.country,
          tax_id: cp.tax_id,
          tax_id_type: cp.tax_id_type,
          company_legal_name: cp.company_legal_name,
          company_trade_name: cp.company_trade_name,
          legal_rep_name: cp.legal_rep_name,
          legal_rep_tax_id: cp.legal_rep_tax_id,
          phone: cp.phone,
          address_postal_code: cp.address_postal_code,
          address_line1: cp.address_line1,
          address_number: cp.address_number,
          address_complement: cp.address_complement,
          address_district: cp.address_district,
          address_city: cp.address_city,
          address_state: cp.address_state,
        },
        licenseAmountUsd: effectiveLicenseUsd,
        territory: data.territory ?? "Non-exclusive, no territorial restriction",
        commission: { negotiatedPct: commissionPct, recruitBonusPct: 0.5, residualOverridePct: 0.07 },
      },
    });

    // Persiste o perfil no convite (materializado no aceite) e o registro do contrato.
    const { error: updErr } = await sb.from("partner_invitations").update({
      prefill_profile: cp,
      license_amount_usd: effectiveLicenseUsd,
    }).eq("id", invitationId);
    if (updErr) prefillPersistError = updErr.message;

    const { error: contractErr } = await sb.from("partner_contracts").insert({
      id: contractId,
      partner_invitation_id: invitationId,
      status: gen.ok ? "pending_review" : "generation_failed",
      country: cp.country,
      template_version: gen.ok ? gen.templateVersion : TEMPLATE_VERSION,
      payload_schema_version: "2026.07-base-v1",
      payload_hash: gen.ok ? gen.payloadHash : "",
      payload: gen.ok ? gen.payload : { error: gen.message },
      storage_path_generated: gen.ok ? gen.storagePath : null,
      error_message: gen.ok ? null : gen.message,
    });
    if (contractErr) {
      return { ok: false, error: "API_ERROR", message: contractErr.message };
    }
  }

  await sb.from("audit_log").insert({
    event_type: "partner_invitation.created",
    actor_user_id: auth.claims.sub,
    metadata: {
      invitation_id: invitationId,
      email: data.email,
      full_name: data.fullName,
      target_role: data.targetRole,
      introduced_by_partner_id: data.introducedByPartnerId ?? null,
      commission_pct: commissionPct,
      no_payment: true,
      prefill_persist_error: prefillPersistError,
    },
  });

  revalidatePath("/partners");
  return { ok: true, invite_url: partnerOnboardingUrl(inviteToken) };
}
