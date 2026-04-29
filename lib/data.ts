import { getCallerClient } from "@socios-ai/auth/admin";
import { encodeCursor, type AuditCursor } from "./audit-cursor";

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

// =============================================================
// Plan G.3: catalog management for plans
// =============================================================

export type BillingPeriod = "monthly" | "yearly" | "one_time" | "custom";
export type PlanCurrency = "usd" | "brl" | "eur";

export type PlanDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  billing_period: BillingPeriod;
  price_amount: number;
  currency: PlanCurrency;
  features: Record<string, unknown>;
  is_active: boolean;
  is_visible: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  metadata: Record<string, unknown>;
  app_slugs: string[];
  created_at: string;
  updated_at: string;
};

export type PlanCatalogRow = PlanDetail & {
  subscriber_count: number;
};

type PlanRowFromDb = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  billing_period: string;
  price_amount: string | number;
  currency: string;
  features: Record<string, unknown> | null;
  is_active: boolean;
  is_visible: boolean;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  plan_apps?: Array<{ app_slug: string }>;
  subscriptions?: Array<{ count: number }>;
};

function normalizePlan(row: PlanRowFromDb): PlanDetail {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    billing_period: row.billing_period as BillingPeriod,
    price_amount: typeof row.price_amount === "string" ? Number(row.price_amount) : row.price_amount,
    currency: row.currency as PlanCurrency,
    features: row.features ?? {},
    is_active: row.is_active,
    is_visible: row.is_visible,
    stripe_product_id: row.stripe_product_id ?? null,
    stripe_price_id: row.stripe_price_id ?? null,
    metadata: row.metadata ?? {},
    app_slugs: (row.plan_apps ?? []).map((p) => p.app_slug),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listPlansCatalog(args: { callerJwt: string }): Promise<PlanCatalogRow[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("plans")
    .select(
      "id, slug, name, description, billing_period, price_amount, currency, features, is_active, is_visible, stripe_product_id, stripe_price_id, metadata, created_at, updated_at, plan_apps:plan_apps(app_slug), subscriptions:subscriptions(count)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listPlansCatalog failed: ${error.message}`);

  return (data ?? []).map((row: PlanRowFromDb) => ({
    ...normalizePlan(row),
    subscriber_count: row.subscriptions?.[0]?.count ?? 0,
  }));
}

export async function getPlan(args: { callerJwt: string; id: string }): Promise<PlanDetail | null> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("plans")
    .select(
      "id, slug, name, description, billing_period, price_amount, currency, features, is_active, is_visible, stripe_product_id, stripe_price_id, metadata, created_at, updated_at, plan_apps:plan_apps(app_slug)",
    )
    .eq("id", args.id)
    .maybeSingle();
  if (error) throw new Error(`getPlan failed: ${error.message}`);
  if (!data) return null;
  return normalizePlan(data as PlanRowFromDb);
}

// =============================================================
// Plan G.4: subscriptions read helper for /users/[id] Planos tab
// =============================================================

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "manual"
  | "expired";

export type UserSubscription = {
  id: string;
  status: SubscriptionStatus;
  started_at: string;
  current_period_end: string | null;
  canceled_at: string | null;
  notes: string | null;
  external_ref: string | null;
  plan: {
    id: string;
    slug: string;
    name: string;
    billing_period: BillingPeriod;
    price_amount: number;
    currency: PlanCurrency;
    app_slugs: string[];
  };
  via: "user" | "org";
  via_org_id: string | null;
  via_app_slug: string | null;
};

export async function listUserSubscriptions(args: {
  callerJwt: string;
  userId: string;
}): Promise<UserSubscription[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });

  const { data: userRows, error: userErr } = await sb
    .from("subscriptions")
    .select(
      "id, status, started_at, current_period_end, canceled_at, external_ref, metadata, plans:plans(id, slug, name, billing_period, price_amount, currency, plan_apps:plan_apps(app_slug))",
    )
    .eq("user_id", args.userId)
    .order("started_at", { ascending: false });
  if (userErr) throw new Error(`listUserSubscriptions (user) failed: ${userErr.message}`);

  const { data: memberships, error: memErr } = await sb
    .from("app_memberships")
    .select("org_id, app_slug")
    .eq("user_id", args.userId)
    .is("revoked_at", null)
    .not("org_id", "is", null);
  if (memErr) throw new Error(`listUserSubscriptions (memberships) failed: ${memErr.message}`);

  const orgKeys = (memberships ?? []) as Array<{ org_id: string; app_slug: string }>;
  const orgIds = Array.from(new Set(orgKeys.map((m) => m.org_id)));

  let orgRows: Record<string, unknown>[] = [];
  if (orgIds.length > 0) {
    const { data, error: orgErr } = await sb
      .from("subscriptions")
      .select(
        "id, org_id, status, started_at, current_period_end, canceled_at, external_ref, metadata, plans:plans(id, slug, name, billing_period, price_amount, currency, plan_apps:plan_apps(app_slug))",
      )
      .in("org_id", orgIds)
      .order("started_at", { ascending: false });
    if (orgErr) throw new Error(`listUserSubscriptions (org) failed: ${orgErr.message}`);
    orgRows = data ?? [];
  }

  function shape(row: Record<string, unknown>, via: "user" | "org"): UserSubscription {
    const metadata = (row.metadata ?? {}) as { notes?: string };
    const plan = row.plans as {
      id: string;
      slug: string;
      name: string;
      billing_period: BillingPeriod;
      price_amount: number;
      currency: PlanCurrency;
      plan_apps?: Array<{ app_slug: string }>;
    };
    let via_org_id: string | null = null;
    let via_app_slug: string | null = null;
    if (via === "org") {
      const orgId = row.org_id as string;
      via_org_id = orgId;
      const match = orgKeys.find((m) => m.org_id === orgId);
      via_app_slug = match?.app_slug ?? null;
    }
    return {
      id: row.id as string,
      status: row.status as SubscriptionStatus,
      started_at: row.started_at as string,
      current_period_end: (row.current_period_end as string | null) ?? null,
      canceled_at: (row.canceled_at as string | null) ?? null,
      notes: metadata.notes ?? null,
      external_ref: (row.external_ref as string | null) ?? null,
      plan: {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        billing_period: plan.billing_period,
        price_amount: plan.price_amount,
        currency: plan.currency,
        app_slugs: (plan.plan_apps ?? []).map((p) => p.app_slug),
      },
      via,
      via_org_id,
      via_app_slug,
    };
  }

  const userShaped = (userRows ?? []).map((r) => shape(r as Record<string, unknown>, "user"));
  const orgShaped = orgRows.map((r) => shape(r, "org"));
  return [...userShaped, ...orgShaped];
}

// =============================================================
// Plan H: org listing helper
// =============================================================

export type OrgListing = {
  orgId: string;
  appSlug: string;
  activeMembers: number;
  firstSeen: string;
  lastActivity: string;
};

export async function listOrgs(args: {
  callerJwt: string;
  app?: string;
}): Promise<OrgListing[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });

  let q = sb
    .from("app_memberships")
    .select("org_id, app_slug, revoked_at, created_at")
    .not("org_id", "is", null);
  if (args.app) q = q.eq("app_slug", args.app);

  const { data, error } = await q;
  if (error) throw new Error(`listOrgs failed: ${error.message}`);

  const rows = (data ?? []) as Array<{
    org_id: string;
    app_slug: string;
    revoked_at: string | null;
    created_at: string;
  }>;

  const groups = new Map<string, OrgListing>();
  for (const r of rows) {
    const key = `${r.org_id}|${r.app_slug}`;
    const existing = groups.get(key);
    const isActive = r.revoked_at === null;
    if (!existing) {
      groups.set(key, {
        orgId: r.org_id,
        appSlug: r.app_slug,
        activeMembers: isActive ? 1 : 0,
        firstSeen: r.created_at,
        lastActivity: r.created_at,
      });
      continue;
    }
    if (isActive) existing.activeMembers += 1;
    if (r.created_at < existing.firstSeen) existing.firstSeen = r.created_at;
    if (r.created_at > existing.lastActivity) existing.lastActivity = r.created_at;
  }

  return [...groups.values()]
    .filter((g) => g.activeMembers > 0)
    .sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1))
    .slice(0, 100);
}

// =============================================================
// Plan H: loadOrg - members + subscriptions for (org, app)
// =============================================================

export type OrgMember = {
  membershipId: string;
  userId: string;
  email: string | null;
  roleSlug: string;
  createdAt: string;
};

export type OrgSubscription = {
  id: string;
  status: string;
  started_at: string;
  current_period_end: string | null;
  canceled_at: string | null;
  external_ref: string | null;
  notes: string | null;
  plan: {
    id: string;
    slug: string;
    name: string;
    billing_period: BillingPeriod;
    price_amount: number;
    currency: PlanCurrency;
    apps: string[];
  };
};

export type OrgDetail = {
  orgId: string;
  appSlug: string;
  members: OrgMember[];
  subscriptions: OrgSubscription[];
};

export async function loadOrg(args: {
  callerJwt: string;
  orgId: string;
  appSlug: string;
}): Promise<OrgDetail | null> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });

  const { data: memberRows, error: memErr } = await sb
    .from("app_memberships")
    .select("id, user_id, role_slug, created_at, profiles:profiles(id, email)")
    .eq("org_id", args.orgId)
    .eq("app_slug", args.appSlug)
    .is("revoked_at", null);
  if (memErr) throw new Error(`loadOrg (members) failed: ${memErr.message}`);

  const members = (memberRows ?? []) as unknown as Array<{
    id: string;
    user_id: string;
    role_slug: string;
    created_at: string;
    profiles: { id: string; email: string | null } | null;
  }>;
  if (members.length === 0) return null;

  const { data: subRows, error: subErr } = await sb
    .from("subscriptions")
    .select(
      "id, status, started_at, current_period_end, canceled_at, external_ref, metadata, plans:plans(id, slug, name, billing_period, price_amount, currency, plan_apps:plan_apps(app_slug))",
    )
    .eq("org_id", args.orgId)
    .order("started_at", { ascending: false });
  if (subErr) throw new Error(`loadOrg (subs) failed: ${subErr.message}`);

  const subscriptions: OrgSubscription[] = (subRows ?? []).map((row: Record<string, unknown>) => {
    const metadata = (row.metadata ?? {}) as { notes?: string };
    const plan = row.plans as {
      id: string;
      slug: string;
      name: string;
      billing_period: BillingPeriod;
      price_amount: number;
      currency: PlanCurrency;
      plan_apps?: Array<{ app_slug: string }>;
    };
    return {
      id: row.id as string,
      status: row.status as string,
      started_at: row.started_at as string,
      current_period_end: (row.current_period_end as string | null) ?? null,
      canceled_at: (row.canceled_at as string | null) ?? null,
      external_ref: (row.external_ref as string | null) ?? null,
      notes: metadata.notes ?? null,
      plan: {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        billing_period: plan.billing_period,
        price_amount: plan.price_amount,
        currency: plan.currency,
        apps: (plan.plan_apps ?? []).map((a) => a.app_slug),
      },
    };
  });

  return {
    orgId: args.orgId,
    appSlug: args.appSlug,
    members: members.map((m) => ({
      membershipId: m.id,
      userId: m.user_id,
      email: m.profiles?.email ?? null,
      roleSlug: m.role_slug,
      createdAt: m.created_at,
    })),
    subscriptions,
  };
}

// =============================================================
// Plan G.5: audit log read helpers
// =============================================================

export type SearchUserIdsResult =
  | { ids: string[]; truncated: boolean }
  | { error: "VALIDATION" };

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function searchUserIdsByEmail(args: {
  callerJwt: string;
  query: string;
}): Promise<SearchUserIdsResult> {
  const trimmed = args.query.trim();
  if (trimmed.length < 3) return { error: "VALIDATION" };

  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("profiles")
    .select("id")
    .ilike("email", `%${escapeIlike(trimmed)}%`)
    .limit(50);

  if (error) throw new Error(`searchUserIdsByEmail failed: ${error.message}`);

  const rows = (data ?? []) as Array<{ id: string }>;
  return { ids: rows.map((r) => r.id), truncated: rows.length === 50 };
}

export async function resolveProfilesByIds(args: {
  callerJwt: string;
  ids: string[];
}): Promise<Map<string, { email: string }>> {
  const unique = Array.from(new Set(args.ids));
  if (unique.length === 0) return new Map();

  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("profiles")
    .select("id, email")
    .in("id", unique);

  if (error) throw new Error(`resolveProfilesByIds failed: ${error.message}`);

  const map = new Map<string, { email: string }>();
  for (const row of (data ?? []) as Array<{ id: string; email: string }>) {
    map.set(row.id, { email: row.email });
  }
  return map;
}

export type AuditLogEntry = {
  id: number;
  event_type: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  app_slug: string | null;
  org_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type AuditFilters = {
  event_type?: string;
  app_slug?: string;
  from?: string;
  to?: string;
};

export type ListAuditEventsArgs = {
  callerJwt: string;
  filters: AuditFilters;
  actorIds?: string[];   // undefined = no actor filter; [] = "0 matches, return empty"
  targetIds?: string[];  // same convention
  cursor?: AuditCursor | null;
};

export type ListAuditEventsResult = {
  rows: AuditLogEntry[];
  hasMore: boolean;
  nextCursor: string | null;
};

const PAGE_SIZE = 50;

export async function listAuditEvents(args: ListAuditEventsArgs): Promise<ListAuditEventsResult> {
  // Empty actor/target IDs short-circuit (means user search returned 0 matches).
  if (args.actorIds !== undefined && args.actorIds.length === 0) {
    return { rows: [], hasMore: false, nextCursor: null };
  }
  if (args.targetIds !== undefined && args.targetIds.length === 0) {
    return { rows: [], hasMore: false, nextCursor: null };
  }

  const sb = getCallerClient({ callerJwt: args.callerJwt });
  let q = sb
    .from("audit_log")
    .select("id, event_type, actor_user_id, target_user_id, app_slug, org_id, metadata, ip_address, user_agent, created_at");

  if (args.filters.event_type) q = q.eq("event_type", args.filters.event_type);
  if (args.filters.app_slug)   q = q.eq("app_slug", args.filters.app_slug);
  if (args.actorIds && args.actorIds.length > 0)   q = q.in("actor_user_id", args.actorIds);
  if (args.targetIds && args.targetIds.length > 0) q = q.in("target_user_id", args.targetIds);
  if (args.filters.from) q = q.gte("created_at", args.filters.from);
  if (args.filters.to)   q = q.lte("created_at", args.filters.to);

  if (args.cursor) {
    q = q.or(
      `created_at.lt.${args.cursor.created_at},and(created_at.eq.${args.cursor.created_at},id.lt.${args.cursor.id})`,
    );
  }

  const { data, error } = await q
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (error) throw new Error(`listAuditEvents failed: ${error.message}`);

  const all = (data ?? []) as AuditLogEntry[];
  const hasMore = all.length > PAGE_SIZE;
  const rows = all.slice(0, PAGE_SIZE);
  const last = rows[rows.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor({ created_at: last.created_at, id: last.id })
    : null;

  return { rows, hasMore, nextCursor };
}

// === Plan K.1 · Partners ===

export type PartnerRow = {
  id: string;
  user_id: string;
  status: "pending_contract" | "pending_payment" | "pending_kyc" | "active" | "suspended" | "terminated";
  introduced_by_partner_id: string | null;
  custom_commission_pct: number | null;
  stripe_connect_account_id: string | null;
  contract_signed_at: string | null;
  contract_envelope_id: string | null;
  license_paid_at: string | null;
  license_amount_paid_usd: number | null;
  kyc_completed_at: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  termination_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PartnerInvitationRow = {
  id: string;
  email: string;
  full_name: string;
  introduced_by_partner_id: string | null;
  invite_token: string;
  contract_envelope_id: string | null;
  payment_link_url: string | null;
  custom_commission_pct: number | null;
  license_amount_usd: number;
  installments: number;
  expires_at: string;
  consumed_at: string | null;
  status: "sent" | "contract_signed" | "paid" | "kyc_completed" | "converted" | "expired" | "revoked";
  created_at: string;
};

export async function listPartners(args: {
  callerJwt: string;
  status?: PartnerRow["status"];
}): Promise<PartnerRow[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  let q = sb.from("partners").select("*");
  if (args.status) q = q.eq("status", args.status);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(`listPartners failed: ${error.message}`);
  return (data ?? []) as PartnerRow[];
}

export async function getPartner(args: {
  callerJwt: string;
  partnerId: string;
}): Promise<PartnerRow | null> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("partners")
    .select("*")
    .eq("id", args.partnerId)
    .maybeSingle();
  if (error) throw new Error(`getPartner failed: ${error.message}`);
  return (data ?? null) as PartnerRow | null;
}

export async function listPartnerInvitations(args: {
  callerJwt: string;
  status?: PartnerInvitationRow["status"];
}): Promise<PartnerInvitationRow[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  let q = sb.from("partner_invitations").select("*");
  if (args.status) q = q.eq("status", args.status);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error(`listPartnerInvitations failed: ${error.message}`);
  return (data ?? []) as PartnerInvitationRow[];
}

export async function getPartnerInvitation(args: {
  callerJwt: string;
  invitationId: string;
}): Promise<PartnerInvitationRow | null> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("partner_invitations")
    .select("*")
    .eq("id", args.invitationId)
    .maybeSingle();
  if (error) throw new Error(`getPartnerInvitation failed: ${error.message}`);
  return (data ?? null) as PartnerInvitationRow | null;
}
