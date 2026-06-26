"use server";

import { getSupabaseAdminClient, getCallerClient } from "@socios-ai/auth/admin";
import { requireRegistrarOrAdminAAL2 } from "@/lib/auth";
import { deriveAdminRoleSlug } from "@/lib/admin-role-slug";
import { resolveNicheHost } from "@/lib/niche-domain";
import { tenantOnboardingInvitationEmail } from "@/lib/email-templates/tenant-onboarding-invitation";
import { sendViaResend } from "@/lib/email-resend";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().uuid("org inválida"),
  appSlug: z.string().trim().min(1, "app inválido"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
});

export type UpdateOrgAdminEmailResult =
  | { ok: true; emailSent: boolean }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

// Edita o e-mail de login do admin de um tenant (org) num app. O registrar NÃO
// envia user_id: resolvemos o admin no servidor. Trava de escalonamento: nunca
// troca o e-mail de um super_admin. Se o e-mail mudou: dispara um novo convite
// (org_admin_invite via CALLER client, pois o RPC rejeita service_role) ANTES de
// trocar o login, pra um convite que falhe não deixar estado parcial; mantém a
// membership atual. Gate: requireRegistrarOrAdminAAL2.
export async function updateOrgAdminEmailAction(input: unknown): Promise<UpdateOrgAdminEmailResult> {
  const auth = await requireRegistrarOrAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { orgId, appSlug, email } = parsed.data;

  const sb = getSupabaseAdminClient();

  // App: role de admin + dados pro convite.
  const { data: appRow, error: appErr } = await sb
    .from("apps")
    .select("name, public_url, role_catalog, metadata")
    .eq("slug", appSlug)
    .maybeSingle();
  if (appErr) return { ok: false, error: "API_ERROR", message: appErr.message };
  if (!appRow) return { ok: false, error: "VALIDATION", message: `app '${appSlug}' não encontrado` };
  const roleCatalog =
    appRow.role_catalog && typeof appRow.role_catalog === "object"
      ? (appRow.role_catalog as Record<string, string>)
      : {};
  const adminRoleSlug = deriveAdminRoleSlug(roleCatalog, appSlug);
  if (!adminRoleSlug) {
    return { ok: false, error: "VALIDATION", message: `app '${appSlug}' não tem admin role` };
  }

  // Org: nome + nicho.
  const { data: orgRow, error: orgErr } = await sb
    .from("orgs")
    .select("name, metadata")
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr) return { ok: false, error: "API_ERROR", message: orgErr.message };
  if (!orgRow) return { ok: false, error: "VALIDATION", message: "org não encontrada" };
  const orgMeta = (orgRow.metadata && typeof orgRow.metadata === "object" ? orgRow.metadata : {}) as Record<string, unknown>;
  const niche = (orgMeta.niche as string | null) ?? null;
  const tenantName = String(orgRow.name);

  // Resolve o user_id do admin daquele (org, app) no servidor.
  const { data: mrow, error: mErr } = await sb
    .from("app_memberships")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("app_slug", appSlug)
    .eq("role_slug", adminRoleSlug)
    .is("revoked_at", null)
    .maybeSingle();
  if (mErr) return { ok: false, error: "API_ERROR", message: mErr.message };
  const userId = (mrow?.user_id as string | null) ?? null;
  if (!userId) {
    return { ok: false, error: "VALIDATION", message: "admin do tenant não encontrado" };
  }

  // E-mail atual + flag de super_admin do alvo (uma leitura).
  const { data: cur, error: curErr } = await sb
    .from("profiles")
    .select("email, is_super_admin")
    .eq("id", userId)
    .maybeSingle();
  if (curErr) return { ok: false, error: "API_ERROR", message: curErr.message };

  // Trava de escalonamento: registrar nunca troca o e-mail de um super_admin.
  if (cur?.is_super_admin === true) {
    return { ok: false, error: "FORBIDDEN" };
  }

  const currentEmail = ((cur?.email as string | null) ?? "").toLowerCase();
  if (currentEmail === email) {
    return { ok: true, emailSent: false };
  }

  // Convite PRIMEIRO, via caller client (o RPC rejeita service_role). Se falhar,
  // nada foi alterado ainda (sem estado parcial).
  const expiresInDays = 7;
  const sbCaller = getCallerClient({ callerJwt: auth.jwt });
  const { data: inviteTokenRaw, error: inviteErr } = await sbCaller.rpc("org_admin_invite", {
    p_org_id: orgId,
    p_email: email,
    p_role_slug: adminRoleSlug,
    p_expires_in_days: expiresInDays,
    p_app_slug: appSlug,
  });
  if (inviteErr) {
    if (inviteErr.code === "42501") return { ok: false, error: "FORBIDDEN" };
    return { ok: false, error: "API_ERROR", message: `convite: ${inviteErr.message}` };
  }
  if (typeof inviteTokenRaw !== "string") {
    return { ok: false, error: "API_ERROR", message: "org_admin_invite retornou token inválido" };
  }
  const inviteToken = inviteTokenRaw;

  // Troca o login (service-role; GoTrue admin). Mantém a membership atual.
  const { error: uErr } = await sb.auth.admin.updateUserById(userId, { email, email_confirm: true });
  if (uErr) return { ok: false, error: "API_ERROR", message: `email: ${uErr.message}` };
  const { error: profErr } = await sb.from("profiles").update({ email }).eq("id", userId);
  if (profErr) return { ok: false, error: "API_ERROR", message: profErr.message };

  // E-mail de onboarding (best-effort).
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  const appPublicUrl = appRow.public_url ? String(appRow.public_url) : null;
  const appFallback = appPublicUrl ?? process.env.NEXT_PUBLIC_PARTNERS_ORIGIN ?? "https://partners.sociosai.com";
  const appMetadata =
    appRow.metadata && typeof appRow.metadata === "object" ? (appRow.metadata as Record<string, unknown>) : null;
  const baseUrl = resolveNicheHost(appMetadata, niche, appFallback);
  const inviteUrl = `${baseUrl.replace(/\/$/, "")}/onboarding/${inviteToken}`;

  let inviterName = "A equipe Sócios AI";
  if (auth.claims.sub) {
    const { data: profile, error: inviterErr } = await sb.from("profiles").select("full_name").eq("id", auth.claims.sub).maybeSingle();
    if (inviterErr) console.warn("updateOrgAdminEmailAction: falha ao buscar nome do convidador", inviterErr.message);
    if (profile?.full_name) inviterName = String(profile.full_name);
  }

  const tpl = tenantOnboardingInvitationEmail({
    inviterName,
    appName: String(appRow.name),
    tenantName,
    inviteUrl,
    expiresAt,
    recipientEmail: email,
  });

  let emailSent = false;
  try {
    await sendViaResend({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      idempotencyKey: `tenant-onboarding-${inviteToken}`,
    });
    emailSent = true;
  } catch {
    emailSent = false;
  }

  return { ok: true, emailSent };
}
