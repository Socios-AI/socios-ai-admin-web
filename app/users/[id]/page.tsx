import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { GlobalUserActions } from "@/components/GlobalUserActions";
import { TabNav, type TabItem } from "@/components/Tabs";
import { AccessTab } from "@/components/AccessTab";
import { PlansTab } from "@/components/PlansTab";
import { AuditTab } from "@/components/AuditTab";
import { getCallerJwt } from "@/lib/auth";
import {
  getUser,
  getUserTier,
  listApps,
  listPlansCatalog,
  listUserSubscriptions,
} from "@/lib/data";

export const dynamic = "force-dynamic";

const VALID_TABS = ["access", "plans", "audit"] as const;
type ValidTab = (typeof VALID_TABS)[number];

function resolveTab(raw: string | string[] | undefined): ValidTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (VALID_TABS as readonly string[]).includes(v ?? "")
    ? (v as ValidTab)
    : "access";
}

const TAB_ITEMS: TabItem[] = [
  { key: "access", label: "Acesso" },
  { key: "plans", label: "Planos" },
  { key: "audit", label: "Auditoria" },
];

export default async function UserDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await props.params;
  const { tab: tabParam } = await props.searchParams;
  const activeTab = resolveTab(tabParam);

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const [user, apps, plansCatalog, subscriptions, tier] = await Promise.all([
    getUser({ callerJwt: jwt, userId: id }),
    listApps({ callerJwt: jwt }),
    listPlansCatalog({ callerJwt: jwt }),
    listUserSubscriptions({ callerJwt: jwt, userId: id }),
    getUserTier({ callerJwt: jwt, userId: id }),
  ]);
  if (!user) notFound();

  const availablePlans = plansCatalog.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    billing_period: p.billing_period,
    price_amount: p.price_amount,
    currency: p.currency,
    is_active: p.is_active,
  }));

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">{user.email}</h1>
        <p className="text-muted-foreground text-sm">
          Criado em {new Date(user.created_at).toLocaleString("pt-BR")}
          {user.is_super_admin && (
            <span className="ml-2 text-primary">· super-admin</span>
          )}
        </p>
      </header>

      <GlobalUserActions
        userId={user.id}
        email={user.email}
        isSuperAdmin={user.is_super_admin}
        tier={tier}
      />

      <TabNav items={TAB_ITEMS} active={activeTab} />

      <div role="tabpanel" hidden={activeTab !== "access"}>
        <AccessTab userId={user.id} memberships={user.memberships} apps={apps} />
      </div>

      <div role="tabpanel" hidden={activeTab !== "plans"}>
        <PlansTab
          userId={user.id}
          subscriptions={subscriptions}
          availablePlans={availablePlans}
        />
      </div>

      <div role="tabpanel" hidden={activeTab !== "audit"}>
        <AuditTab userId={user.id} events={user.recentAudit} />
      </div>
    </AdminShell>
  );
}
