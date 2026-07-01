// Leitura CURADA para o papel "cadastrador" (tier `registrar`).
//
// Por que service-role + SELECT explícito: as tabelas partners/partner_edges
// têm colunas financeiras (custom_commission_pct, rate_to_parent, license_*).
// Relaxar RLS pra registrar exporia esses valores via PostgREST direto com o
// JWT dele. Aqui lemos via service-role e devolvemos SÓ campos não-financeiros,
// então nenhuma cifra chega ao registrar (nem na tela, nem no payload do client).
//
// Regra: NUNCA adicionar colunas financeiras aos selects abaixo.

import { getSupabaseAdminClient } from "@socios-ai/auth/admin";
import { deriveAdminRoleSlug } from "@/lib/admin-role-slug";
import { appCanReceiveOrgInvite } from "@/lib/org-invite-base";

export type RegistrarPartner = {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  role: string | null;
  tier: "licensee" | "reseller";
  status: string;
  introducedByPartnerId: string | null;
  createdAt: string;
};

export type RegistrarInvite = {
  id: string;
  email: string;
  fullName: string;
  targetRole: string | null;
  status: string;
  expiresAt: string;
};

export type RegistrarOrg = {
  id: string;
  name: string;
  slug: string;
  niche: string | null;
  createdAt: string;
};

export type RegistrarOrgDetail = {
  id: string;
  name: string;
  slug: string;
  niche: string | null;
  createdAt: string;
  members: Array<{ appSlug: string; roleSlug: string; userId: string | null; name: string | null; email: string | null; isAdmin: boolean; appCanInvite: boolean; grantedAt: string }>;
};

export type RegistrarTreeNode = {
  id: string;
  name: string;
  role: string | null;
  tier: "licensee" | "reseller";
  status: string;
  depth: number;
};

async function resolveNames(
  ids: string[],
): Promise<Map<string, { name: string; email: string | null }>> {
  const map = new Map<string, { name: string; email: string | null }>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return map;
  const sb = getSupabaseAdminClient();
  const { data } = await sb
    .from("profiles")
    .select("id, full_name, email")
    .in("id", unique);
  for (const row of data ?? []) {
    map.set(String(row.id), {
      name: (row.full_name as string | null) ?? "",
      email: (row.email as string | null) ?? null,
    });
  }
  return map;
}

export async function listPartnersForRegistrar(): Promise<RegistrarPartner[]> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("partners")
    // SELECT explícito · SEM custom_commission_pct/license_*/stripe_*.
    .select("id, user_id, role, tier, status, introduced_by_partner_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listPartnersForRegistrar failed: ${error.message}`);
  const rows = data ?? [];
  const names = await resolveNames(rows.flatMap((r) => (r.user_id ? [String(r.user_id)] : [])));
  return rows.map((r) => {
    const prof = r.user_id ? names.get(String(r.user_id)) : undefined;
    return {
      id: String(r.id),
      userId: (r.user_id as string | null) ?? null,
      name: prof?.name || "(sem nome)",
      email: prof?.email ?? null,
      role: (r.role as string | null) ?? null,
      tier: r.tier as "licensee" | "reseller",
      status: String(r.status),
      introducedByPartnerId: (r.introduced_by_partner_id as string | null) ?? null,
      createdAt: String(r.created_at),
    };
  });
}

const PENDING_INVITE_STATUSES = ["sent", "contract_signed", "paid", "kyc_completed"];

export async function listInvitesForRegistrar(): Promise<RegistrarInvite[]> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("partner_invitations")
    // SEM license_amount_usd/payment_link_url/custom_commission_pct.
    .select("id, email, full_name, target_role, status, expires_at")
    .in("status", PENDING_INVITE_STATUSES)
    .order("expires_at", { ascending: true });
  if (error) throw new Error(`listInvitesForRegistrar failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    email: String(r.email),
    fullName: String(r.full_name),
    targetRole: (r.target_role as string | null) ?? null,
    status: String(r.status),
    expiresAt: String(r.expires_at),
  }));
}

export async function listOrgsForRegistrar(): Promise<RegistrarOrg[]> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("orgs")
    .select("id, name, slug, metadata, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listOrgsForRegistrar failed: ${error.message}`);
  return (data ?? []).map((r) => {
    const meta = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
    return {
      id: String(r.id),
      name: String(r.name),
      slug: String(r.slug),
      niche: (meta.niche as string | null) ?? null,
      createdAt: String(r.created_at),
    };
  });
}

// Detalhe curado de uma org pro cadastrador: nome/slug/nicho + membros por app.
// SEM nenhuma leitura de subscriptions/plans (regra do arquivo: nada financeiro).
export async function loadOrgForRegistrar(orgId: string): Promise<RegistrarOrgDetail | null> {
  const sb = getSupabaseAdminClient();

  const { data: org, error: orgErr } = await sb
    .from("orgs")
    .select("id, name, slug, metadata, created_at")
    .eq("id", orgId)
    .maybeSingle();
  if (orgErr) throw new Error(`loadOrgForRegistrar (org) failed: ${orgErr.message}`);
  if (!org) return null;

  const { data: memberRows, error: memErr } = await sb
    .from("app_memberships")
    // SELECT explícito · SEM nenhuma coluna financeira.
    .select("app_slug, role_slug, user_id, granted_at")
    .eq("org_id", orgId)
    .is("revoked_at", null);
  if (memErr) throw new Error(`loadOrgForRegistrar (members) failed: ${memErr.message}`);

  const rows = (memberRows ?? []) as Array<{
    app_slug: string;
    role_slug: string;
    user_id: string | null;
    granted_at: string;
  }>;
  const names = await resolveNames(rows.flatMap((r) => (r.user_id ? [String(r.user_id)] : [])));

  // Role de admin por app, pra marcar qual membro é o admin editável.
  const appSlugs = [...new Set(rows.map((r) => r.app_slug))];
  const adminRoleByApp = new Map<string, string | null>();
  const publicUrlByApp = new Map<string, string | null>();
  if (appSlugs.length > 0) {
    const { data: appRows } = await sb.from("apps").select("slug, role_catalog, public_url").in("slug", appSlugs);
    for (const a of (appRows ?? []) as Array<{ slug: string; role_catalog: unknown; public_url: unknown }>) {
      const rc = (a.role_catalog && typeof a.role_catalog === "object"
        ? a.role_catalog
        : {}) as Record<string, string>;
      adminRoleByApp.set(String(a.slug), deriveAdminRoleSlug(rc, String(a.slug)));
      publicUrlByApp.set(String(a.slug), (a.public_url as string | null) ?? null);
    }
  }

  const meta = (org.metadata && typeof org.metadata === "object" ? org.metadata : {}) as Record<string, unknown>;

  return {
    id: String(org.id),
    name: String(org.name),
    slug: String(org.slug),
    niche: (meta.niche as string | null) ?? null,
    createdAt: String(org.created_at),
    members: rows.map((r) => ({
      appSlug: String(r.app_slug),
      roleSlug: String(r.role_slug),
      userId: r.user_id ? String(r.user_id) : null,
      name: r.user_id ? (names.get(String(r.user_id))?.name || null) : null,
      email: r.user_id ? (names.get(String(r.user_id))?.email ?? null) : null,
      isAdmin: adminRoleByApp.get(String(r.app_slug)) === String(r.role_slug),
      appCanInvite: appCanReceiveOrgInvite(String(r.app_slug), publicUrlByApp.get(String(r.app_slug)) ?? null),
      grantedAt: String(r.granted_at),
    })),
  };
}

// Árvore computada a partir de introduced_by_partner_id (sem tocar no RPC de
// subtree, que devolve rate_to_parent/earned). Ordena raízes → folhas por DFS.
export async function listTreeForRegistrar(): Promise<RegistrarTreeNode[]> {
  const partners = await listPartnersForRegistrar();
  const byId = new Map(partners.map((p) => [p.id, p]));
  const children = new Map<string | null, RegistrarPartner[]>();
  for (const p of partners) {
    // Pai inválido/ausente (ou aponta pra fora) vira raiz.
    const parent = p.introducedByPartnerId && byId.has(p.introducedByPartnerId)
      ? p.introducedByPartnerId
      : null;
    const arr = children.get(parent) ?? [];
    arr.push(p);
    children.set(parent, arr);
  }
  const out: RegistrarTreeNode[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const kids = (children.get(parentId) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    for (const k of kids) {
      out.push({ id: k.id, name: k.name, role: k.role, tier: k.tier, status: k.status, depth });
      walk(k.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
