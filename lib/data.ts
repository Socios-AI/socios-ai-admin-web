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
};

export async function listUserSubscriptions(args: {
  callerJwt: string;
  userId: string;
}): Promise<UserSubscription[]> {
  const sb = getCallerClient({ callerJwt: args.callerJwt });
  const { data, error } = await sb
    .from("subscriptions")
    .select(
      "id, status, started_at, current_period_end, canceled_at, external_ref, metadata, plans:plans(id, slug, name, billing_period, price_amount, currency, plan_apps:plan_apps(app_slug))",
    )
    .eq("user_id", args.userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listUserSubscriptions failed: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => {
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
    };
  });
}
