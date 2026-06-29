"use server";

import { getCallerClient } from "@socios-ai/auth/admin";
import { requireRegistrarOrAdminAAL2 } from "@/lib/auth";
import { createOrgSchema } from "@/lib/validation";
import { generateOrgSlug } from "@/lib/org-slug";
import { deriveAdminRoleSlug } from "@/lib/admin-role-slug";
import { resolveNicheHost } from "@/lib/niche-domain";
import { tenantOnboardingInvitationEmail } from "@/lib/email-templates/tenant-onboarding-invitation";
import { sendViaResend } from "@/lib/email-resend";
import { appCanReceiveOrgInvite } from "@/lib/org-invite-base";

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

  if (!appCanReceiveOrgInvite(data.appSlug, appPublicUrl)) {
    return { ok: false, error: "VALIDATION", message: `app '${data.appSlug}' não tem onboarding; selecione um app válido (não o platform)` };
  }

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

  // Cria a org + convite do dono ATOMICAMENTE. O e-mail do admin é obrigatório
  // e o criador NÃO vira membro da org · o cliente vira dono (org_admin) no
  // aceite (grant_org_admin=true). Carimba o indicante explícito (registrar/super_admin).
  const { data: rpcRows, error: rpcErr } = await sb.rpc("create_org_with_owner_invite", {
    p_name: data.tenantName,
    p_slug: tenantSlug,
    p_app_slug: data.appSlug,
    p_admin_email: data.adminEmail,
    p_niche: data.niche ?? null,
    p_introduced_by_partner_id: data.introducedByPartnerId ?? null,
    p_expires_in_days: expiresInDays,
  });
  if (rpcErr) {
    if (rpcErr.code === "42501") return { ok: false, error: "FORBIDDEN" };
    if (rpcErr.code === "22023" || rpcErr.code === "23505") {
      return { ok: false, error: "VALIDATION", message: rpcErr.message };
    }
    if (
      rpcErr.code === "P0001" &&
      /(niche|introduced_by_partner|cannot be your own)/i.test(rpcErr.message)
    ) {
      return { ok: false, error: "VALIDATION", message: rpcErr.message };
    }
    return { ok: false, error: "API_ERROR", message: rpcErr.message };
  }
  const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
  const orgId = row?.out_org_id;
  const inviteToken = row?.out_invite_token;
  if (typeof orgId !== "string" || typeof inviteToken !== "string") {
    return { ok: false, error: "API_ERROR", message: "create_org_with_owner_invite retornou dados inválidos" };
  }

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
