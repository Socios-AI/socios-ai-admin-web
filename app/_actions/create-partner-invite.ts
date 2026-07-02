"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireRegistrarOrAdminAAL2 } from "@/lib/auth";
import { createPartnerInviteSchema } from "@/lib/validation";

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
    },
  });

  const base = process.env.PARTNERS_WEB_BASE_URL ?? "https://partners.sociosai.com";
  revalidatePath("/partners");
  return { ok: true, invite_url: `${base.replace(/\/$/, "")}/onboarding/${inviteToken}` };
}
