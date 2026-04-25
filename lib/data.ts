import { getCallerClient } from "@socios-ai/auth/admin";

export type UserRow = {
  id: string;
  email: string;
  created_at: string;
  is_super_admin: boolean;
  membership_count: number;
};

export type Membership = {
  id: string;
  app_slug: string;
  org_id: string | null;
  role_slug: string;
  created_at: string;
  revoked_at: string | null;
};

export type AuditEvent = {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type ListUsersArgs = {
  callerJwt: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listUsers(args: ListUsersArgs): Promise<{ rows: UserRow[]; total: number }> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const limit = args.limit ?? 20;
  const offset = args.offset ?? 0;

  // We query auth.users-like data via the public.profiles table (which the JWT hook keeps in sync).
  // Email lives in auth.users; super-admin RLS bypass on profiles allows joining via FK.
  // For v1 simplicity, query profiles + count memberships separately.
  let query = sb
    .from("profiles")
    .select("id, email, created_at, is_super_admin, app_memberships:app_memberships(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (args.search) {
    query = query.ilike("email", `%${args.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`listUsers failed: ${error.message}`);

  const rows: UserRow[] = (data ?? []).map((p: { id: string; email: string; created_at: string; is_super_admin: boolean; app_memberships?: Array<{ count: number }> }) => ({
    id: p.id,
    email: p.email,
    created_at: p.created_at,
    is_super_admin: p.is_super_admin,
    membership_count: p.app_memberships?.[0]?.count ?? 0,
  }));
  return { rows, total: count ?? 0 };
}

export type GetUserResult = {
  id: string;
  email: string;
  created_at: string;
  is_super_admin: boolean;
  memberships: Membership[];
  recentAudit: AuditEvent[];
};

export async function getUser(args: { callerJwt: string; userId: string }): Promise<GetUserResult | null> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });

  const { data: profile, error: pErr } = await sb
    .from("profiles")
    .select("id, email, created_at, is_super_admin")
    .eq("id", args.userId)
    .single();
  if (pErr || !profile) return null;

  const { data: memberships, error: mErr } = await sb
    .from("app_memberships")
    .select("id, app_slug, org_id, role_slug, created_at, revoked_at")
    .eq("user_id", args.userId)
    .order("created_at", { ascending: false });
  if (mErr) throw new Error(`getUser memberships failed: ${mErr.message}`);

  const { data: audit, error: aErr } = await sb
    .from("audit_log")
    .select("id, event_type, actor_user_id, target_user_id, metadata, created_at")
    .or(`actor_user_id.eq.${args.userId},target_user_id.eq.${args.userId}`)
    .order("created_at", { ascending: false })
    .limit(20);
  if (aErr) throw new Error(`getUser audit failed: ${aErr.message}`);

  return {
    id: profile.id,
    email: profile.email,
    created_at: profile.created_at,
    is_super_admin: profile.is_super_admin,
    memberships: (memberships ?? []) as Membership[],
    recentAudit: (audit ?? []) as AuditEvent[],
  };
}

export type AppRow = { slug: string; name: string };

export async function listApps(args: { callerJwt: string }): Promise<AppRow[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("apps")
    .select("slug, name")
    .order("name", { ascending: true });
  if (error) throw new Error(`listApps failed: ${error.message}`);
  return (data ?? []) as AppRow[];
}

// =============================================================
// Plan G.2: catalog management for apps
// =============================================================

export type AppStatus = "active" | "beta" | "sunset" | "archived";

export type AppDetail = {
  slug: string;
  name: string;
  description: string | null;
  public_url: string | null;
  icon_url: string | null;
  status: AppStatus;
  active: boolean;
  accepts_new_subscriptions: boolean;
  responsible_user_id: string | null;
  metadata: Record<string, unknown>;
  role_catalog: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AppCatalogRow = AppDetail & {
  membership_count: number;
};

export async function listAppsCatalog(args: { callerJwt: string }): Promise<AppCatalogRow[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("apps")
    .select(
      "slug, name, description, public_url, icon_url, status, active, accepts_new_subscriptions, responsible_user_id, metadata, role_catalog, created_at, updated_at, app_memberships:app_memberships(count)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listAppsCatalog failed: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown> & { app_memberships?: Array<{ count: number }> }) => ({
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    public_url: (row.public_url as string | null) ?? null,
    icon_url: (row.icon_url as string | null) ?? null,
    status: row.status as AppStatus,
    active: row.active as boolean,
    accepts_new_subscriptions: row.accepts_new_subscriptions as boolean,
    responsible_user_id: (row.responsible_user_id as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    role_catalog: (row.role_catalog as Record<string, unknown>) ?? {},
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    membership_count: row.app_memberships?.[0]?.count ?? 0,
  }));
}

export async function getApp(args: { callerJwt: string; slug: string }): Promise<AppDetail | null> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("apps")
    .select(
      "slug, name, description, public_url, icon_url, status, active, accepts_new_subscriptions, responsible_user_id, metadata, role_catalog, created_at, updated_at",
    )
    .eq("slug", args.slug)
    .maybeSingle();
  if (error) throw new Error(`getApp failed: ${error.message}`);
  if (!data) return null;
  return {
    slug: data.slug,
    name: data.name,
    description: data.description ?? null,
    public_url: data.public_url ?? null,
    icon_url: data.icon_url ?? null,
    status: data.status as AppStatus,
    active: data.active,
    accepts_new_subscriptions: data.accepts_new_subscriptions,
    responsible_user_id: data.responsible_user_id ?? null,
    metadata: data.metadata ?? {},
    role_catalog: data.role_catalog ?? {},
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}
