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
