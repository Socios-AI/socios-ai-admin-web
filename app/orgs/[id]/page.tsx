import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { OrgPlansSection } from "@/components/OrgPlansSection";
import { OrgEditDialog } from "@/components/OrgEditDialog";
import { RegistrarOrgDetailView } from "@/components/RegistrarOrgDetailView";
import { getCallerJwt, getEffectiveRegistrar } from "@/lib/auth";
import { loadOrg, listPlansCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function OrgDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ app?: string | string[] }>;
}) {
  const { id } = await props.params;

  // Cadastrador (registrar real OU super_admin em modo "ver como Cadastrador"):
  // view curada sem financeiro, org-cêntrica (não precisa de ?app=).
  const { isRegistrar } = await getEffectiveRegistrar();
  if (isRegistrar) {
    return (
      <AdminShell>
        <RegistrarOrgDetailView orgId={id} />
      </AdminShell>
    );
  }

  const { app: appParam } = await props.searchParams;
  const appSlug = Array.isArray(appParam) ? appParam[0] : appParam;
  if (!appSlug) {
    redirect("/orgs");
  }

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const [org, plansCatalog] = await Promise.all([
    loadOrg({ callerJwt: jwt, orgId: id, appSlug }),
    listPlansCatalog({ callerJwt: jwt }),
  ]);
  if (!org) notFound();

  const availablePlans = plansCatalog
    .filter((p) => p.is_active)
    .map((p) => ({
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
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl">
            {org.name ?? <span className="font-mono">{org.orgId.slice(0, 8)}</span>}
            <span className="ml-2 text-base text-muted-foreground">no app {org.appSlug}</span>
          </h1>
          <p className="text-muted-foreground text-sm font-mono">
            {org.slug ? `${org.slug} · ` : ""}{org.orgId.slice(0, 8)}
          </p>
          <p className="text-muted-foreground text-sm">
            {org.members.length}{" "}
            {org.members.length === 1 ? "membro ativo" : "membros ativos"}
          </p>
        </div>
        <OrgEditDialog orgId={org.orgId} initialName={org.name ?? ""} />
      </header>

      <section className="mb-8">
        <h2 className="font-display font-semibold text-lg mb-3">Membros</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2">Email</th>
              <th className="py-2">Papel</th>
              <th className="py-2">Concedido em</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {org.members.map((m) => (
              <tr key={m.membershipId} className="border-t border-border">
                <td className="py-2">
                  {m.email ?? <span className="text-muted-foreground">sem email</span>}
                </td>
                <td className="py-2">{m.roleSlug}</td>
                <td className="py-2">{formatDate(m.createdAt)}</td>
                <td className="py-2">
                  <Link href={`/users/${m.userId}`} className="text-primary hover:underline">
                    Gerenciar via usuário
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-display font-semibold text-lg mb-3">Planos</h2>
        <OrgPlansSection
          orgId={org.orgId}
          appSlug={org.appSlug}
          subscriptions={org.subscriptions}
          availablePlans={availablePlans}
        />
      </section>
    </AdminShell>
  );
}
