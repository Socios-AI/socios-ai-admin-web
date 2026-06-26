"use server";

import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { requireRegistrarOrAdminAAL2 } from "@/lib/auth";
import { deriveAdminRoleSlug } from "@/lib/admin-role-slug";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().uuid("org inválida"),
  appSlug: z.string().trim().min(1, "app inválido"),
  email: z.string().trim().toLowerCase().email("Email inválido"),
});

export type UpdateOrgAdminEmailResult =
  | { ok: true }
  | { ok: false; error: "FORBIDDEN" | "VALIDATION" | "API_ERROR"; message?: string };

// Edita o e-mail de login do admin de um tenant (org) num app. O registrar NÃO
// envia user_id: resolvemos o admin no servidor (apps.role_catalog +
// app_memberships) pra ele não conseguir mirar um usuário arbitrário. Troca no
// GoTrue só se o e-mail mudou. Gate: requireRegistrarOrAdminAAL2.
export async function updateOrgAdminEmailAction(input: unknown): Promise<UpdateOrgAdminEmailResult> {
  const auth = await requireRegistrarOrAdminAAL2();
  if (!auth) return { ok: false, error: "FORBIDDEN" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "VALIDATION", message: parsed.error.issues[0]?.message };
  }
  const { orgId, appSlug, email } = parsed.data;

  const sb = getSupabaseAdminClient();

  // Role de admin do app.
  const { data: appRow, error: appErr } = await sb
    .from("apps")
    .select("role_catalog")
    .eq("slug", appSlug)
    .maybeSingle();
  if (appErr) return { ok: false, error: "API_ERROR", message: appErr.message };
  const roleCatalog =
    appRow?.role_catalog && typeof appRow.role_catalog === "object"
      ? (appRow.role_catalog as Record<string, string>)
      : {};
  const adminRoleSlug = deriveAdminRoleSlug(roleCatalog, appSlug);
  if (!adminRoleSlug) {
    return { ok: false, error: "VALIDATION", message: `app '${appSlug}' não tem admin role` };
  }

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

  // Troca no GoTrue (já confirmado) só se mudou.
  const { data: cur } = await sb.from("profiles").select("email").eq("id", userId).maybeSingle();
  const currentEmail = ((cur?.email as string | null) ?? "").toLowerCase();
  if (currentEmail !== email) {
    const { error: uErr } = await sb.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (uErr) return { ok: false, error: "API_ERROR", message: `email: ${uErr.message}` };
  }

  const { error: profErr } = await sb.from("profiles").update({ email }).eq("id", userId);
  if (profErr) return { ok: false, error: "API_ERROR", message: profErr.message };

  return { ok: true };
}
