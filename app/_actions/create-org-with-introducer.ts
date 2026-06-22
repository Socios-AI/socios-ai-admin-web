"use server";

import { getCallerClient } from "@socios-ai/auth/admin";
import { requireRegistrarOrAdminAAL2 } from "@/lib/auth";
import { createOrgSchema } from "@/lib/validation";
import { generateOrgSlug } from "@/lib/org-slug";
import { deriveAdminRoleSlug } from "@/lib/admin-role-slug";
import { resolveNicheHost } from "@/lib/niche-domain";
import { tenantOnboardingInvitationEmail } from "@/lib/email-templates/tenant-onboarding-invitation";
import { sendViaResend } from "@/lib/email-resend";

export type CreateOrgResult =
  | {
      ok: true;
      tenant: {
        orgId: string;
        appSlug: string;
        appName: string;
        tenantName: string;
        tenantSlug: string;
        adminEmail: string;
        inviteToken: string;
        inviteUrl: string;
        expiresAt: string;
        emailSent: boolean;
        emailError?: string;
        introducedByPartnerId?: string;
      };
    }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

export async function createOrgWithIntroducerAction(input: unknown): Promise<CreateOrgResult> {
  const auth = await requireRegistrarOrAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = createOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const data = parsed.data;
  const expiresInDays = data.expiresInDays ?? 7;

  const sb = getCallerClient({ callerJwt: auth.jwt });

  // Valida o app (existe, ativo, aceita novos tenants) antes da RPC.
  const { data: appRow, error: appErr } = await sb
    .from("apps")
    .select("slug, name, public_url, status, accepts_new_subscriptions, role_catalog, metadata")
    .eq("slug", data.appSlug)
    .maybeSingle();
  if (appErr) return { ok: false, error: "API_ERROR", message: appErr.message };
  if (!appRow) return { ok: false, error: "VALIDATION", message: `app '${data.appSlug}' não encontrado` };
  if (appRow.status !== "active" || appRow.accepts_new_subscriptions !== true) {
    return { ok: false, error: "VALIDATION", message: `app '${data.appSlug}' não aceita novos clientes` };
  }
  const appName = String(appRow.name);
  const appPublicUrl = appRow.public_url ? String(appRow.public_url) : null;

  const roleCatalog =
    appRow.role_catalog && typeof appRow.role_catalog === "object"
      ? (appRow.role_catalog as Record<string, string>)
      : {};
  const adminRoleSlug = deriveAdminRoleSlug(roleCatalog, data.appSlug);
  if (!adminRoleSlug) {
    return { ok: false, error: "VALIDATION", message: `app '${data.appSlug}' não tem admin role no role_catalog` };
  }

  // Slug derivado do nome (admin não informa mais). Sufixo aleatório garante
  // unicidade contra a constraint UNIQUE de orgs.slug.
  const tenantSlug = generateOrgSlug(data.tenantName);

  // Cria a org carimbando o indicante explícito (super_admin override).
  const { data: orgIdRaw, error: orgErr } = await sb.rpc("create_org_for_app", {
    p_name: data.tenantName,
    p_slug: tenantSlug,
    p_app_slug: data.appSlug,
    p_admin_user_id: null,
    p_niche: data.niche ?? null,
    p_introduced_by_partner_id: data.introducedByPartnerId ?? null,
  });
  if (orgErr) {
    if (orgErr.code === "42501") return { ok: false, error: "FORBIDDEN" };
    if (orgErr.code === "22023" || orgErr.code === "23505") {
      return { ok: false, error: "VALIDATION", message: orgErr.message };
    }
    if (orgErr.code === "P0001" && /(niche|introduced_by_partner)/i.test(orgErr.message)) {
      return { ok: false, error: "VALIDATION", message: orgErr.message };
    }
    return { ok: false, error: "API_ERROR", message: orgErr.message };
  }
  if (typeof orgIdRaw !== "string") {
    return { ok: false, error: "API_ERROR", message: "create_org_for_app retornou id inválido" };
  }
  const orgId = orgIdRaw;

  // Convida o admin do tenant.
  const { data: inviteTokenRaw, error: inviteErr } = await sb.rpc("org_admin_invite", {
    p_org_id: orgId,
    p_email: data.adminEmail,
    p_role_slug: adminRoleSlug,
    p_expires_in_days: expiresInDays,
    p_app_slug: data.appSlug,
  });
  if (inviteErr) {
    if (inviteErr.code === "42501") return { ok: false, error: "FORBIDDEN" };
    return { ok: false, error: "API_ERROR", message: inviteErr.message };
  }
  if (typeof inviteTokenRaw !== "string") {
    return { ok: false, error: "API_ERROR", message: "org_admin_invite retornou token inválido" };
  }
  const inviteToken = inviteTokenRaw;

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  const appFallback =
    appPublicUrl ?? process.env.NEXT_PUBLIC_PARTNERS_ORIGIN ?? "https://partners.sociosai.com";
  const appMetadata =
    appRow.metadata && typeof appRow.metadata === "object"
      ? (appRow.metadata as Record<string, unknown>)
      : null;
  const baseUrl = resolveNicheHost(appMetadata, data.niche ?? null, appFallback);
  const inviteUrl = `${baseUrl.replace(/\/$/, "")}/onboarding/${inviteToken}`;

  let inviterName = "A equipe Sócios AI";
  if (auth.claims.sub) {
    const { data: profile } = await sb
      .from("profiles")
      .select("full_name")
      .eq("id", auth.claims.sub)
      .maybeSingle();
    if (profile?.full_name) inviterName = String(profile.full_name);
  }

  const tpl = tenantOnboardingInvitationEmail({
    inviterName,
    appName,
    tenantName: data.tenantName,
    inviteUrl,
    expiresAt,
    recipientEmail: data.adminEmail,
  });

  let emailSent = false;
  let emailError: string | undefined;
  try {
    await sendViaResend({
      to: data.adminEmail,
      subject: tpl.subject,
      html: tpl.html,
      idempotencyKey: `tenant-onboarding-${inviteToken}`,
    });
    emailSent = true;
  } catch (e) {
    emailError = e instanceof Error ? e.message : String(e);
  }

  return {
    ok: true,
    tenant: {
      orgId,
      appSlug: data.appSlug,
      appName,
      tenantName: data.tenantName,
      tenantSlug,
      adminEmail: data.adminEmail,
      inviteToken,
      inviteUrl,
      expiresAt,
      emailSent,
      emailError,
      introducedByPartnerId: data.introducedByPartnerId,
    },
  };
}
