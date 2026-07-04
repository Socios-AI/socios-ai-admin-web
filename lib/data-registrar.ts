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

// Uma org individual dentro do agrupamento por cliente.
export type RegistrarClientOrg = {
  orgId: string;
  niche: string | null;
  createdAt: string;
};

// Um "cliente" = todas as orgs do mesmo responsável (dono), colapsadas numa linha.
export type RegistrarClient = {
  key: string; // user_id do dono, ou `org:<id>` quando a org não tem membro
  name: string; // rótulo (nome da org mais recente do grupo)
  createdAt: string; // createdAt da org mais recente do grupo
  orgs: RegistrarClientOrg[]; // orgs do cliente, mais recentes primeiro
};

type OrgRowForGroup = { id: string; name: string; niche: string | null; createdAt: string };
type MemberRowForGroup = { orgId: string; userId: string | null; roleSlug: string; appSlug: string };

// Agrupa orgs por responsável (dono). Dono = membro `org_admin` no app
// `platform`; cai pra qualquer `org_admin`, depois qualquer membro. Org sem
// membro vira seu próprio grupo. Espelha o padrão do admin (N coisas → 1 linha
// com chips + expandir), aqui colapsando as N orgs/nichos de um mesmo cliente.
export function groupOrgsByClient(
  orgs: OrgRowForGroup[],
  members: MemberRowForGroup[],
): RegistrarClient[] {
  const membersByOrg = new Map<string, MemberRowForGroup[]>();
  for (const m of members) {
    const arr = membersByOrg.get(m.orgId);
    if (arr) arr.push(m);
    else membersByOrg.set(m.orgId, [m]);
  }
  const ownerOf = (orgId: string): string | null => {
    const ms = membersByOrg.get(orgId) ?? [];
    const platformAdmin = ms.find((m) => m.appSlug === "platform" && m.roleSlug === "org_admin" && m.userId);
    if (platformAdmin?.userId) return platformAdmin.userId;
    const anyAdmin = ms.find((m) => m.roleSlug === "org_admin" && m.userId);
    if (anyAdmin?.userId) return anyAdmin.userId;
    return ms.find((m) => m.userId)?.userId ?? null;
  };

  const groups = new Map<
    string,
    { key: string; name: string; latest: string; orgs: RegistrarClientOrg[] }
  >();
  for (const o of orgs) {
    const key = ownerOf(o.id) ?? `org:${o.id}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, name: o.name, latest: o.createdAt, orgs: [] };
      groups.set(key, g);
    }
    g.orgs.push({ orgId: o.id, niche: o.niche, createdAt: o.createdAt });
    if (o.createdAt > g.latest) {
      g.latest = o.createdAt;
      g.name = o.name;
    }
  }

  return [...groups.values()]
    .map((g) => ({
      key: g.key,
      name: g.name,
      createdAt: g.latest,
      orgs: [...g.orgs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

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

export async function listOrgsForRegistrar(): Promise<RegistrarClient[]> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from("orgs")
    .select("id, name, metadata, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listOrgsForRegistrar failed: ${error.message}`);
  const orgRows: OrgRowForGroup[] = (data ?? []).map((r) => {
    const meta = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
    return {
      id: String(r.id),
      name: String(r.name),
      niche: (meta.niche as string | null) ?? null,
      createdAt: String(r.created_at),
    };
  });

  // Resolver o dono de cada org para agrupar por cliente. SELECT sem colunas
  // financeiras (regra do arquivo).
  const orgIds = orgRows.map((o) => o.id);
  let memberRows: MemberRowForGroup[] = [];
  if (orgIds.length > 0) {
    const { data: mData, error: mErr } = await sb
      .from("app_memberships")
      .select("org_id, user_id, role_slug, app_slug")
      .in("org_id", orgIds)
      .is("revoked_at", null);
    if (mErr) throw new Error(`listOrgsForRegistrar (members) failed: ${mErr.message}`);
    memberRows = ((mData ?? []) as Array<Record<string, unknown>>).map((r) => ({
      orgId: String(r.org_id),
      userId: r.user_id ? String(r.user_id) : null,
      roleSlug: String(r.role_slug),
      appSlug: String(r.app_slug),
    }));
  }

  return groupOrgsByClient(orgRows, memberRows);
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
