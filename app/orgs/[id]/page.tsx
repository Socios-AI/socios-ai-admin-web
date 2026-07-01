import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { OrgPlansSection } from "@/components/OrgPlansSection";
import { OrgEditDialog } from "@/components/OrgEditDialog";
import { RegistrarOrgDetailView } from "@/components/RegistrarOrgDetailView";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
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
    return (
      <AdminShell>
        <PageHeader
          title="Organização"
          breadcrumbs={[{ label: "Organizações", href: "/orgs" }]}
        />
        <EmptyState
          title="Selecione um app"
          description="Uma organização é vista no contexto de um app. Abra-a a partir da lista para escolher o app."
          action={
            <Link href="/orgs" className={buttonClasses({ variant: "primary", size: "sm" })}>
              Voltar para organizações
            </Link>
          }
        />
      </AdminShell>
    );
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

  const displayName = org.name ?? org.orgId.slice(0, 8);

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
      <PageHeader
        breadcrumbs={[{ label: "Organizações", href: "/orgs" }, { label: displayName }]}
        title={
          <span className="inline-flex items-center gap-2">
            {org.name ?? <span className="font-mono">{org.orgId.slice(0, 8)}</span>}
            <Badge variant="muted">{org.appSlug}</Badge>
          </span>
        }
        subtitle={
          <span className="font-mono">
            {org.slug ? `${org.slug} · ` : ""}
            {org.orgId.slice(0, 8)}
            <span className="ml-2 font-sans">
              · {org.members.length}{" "}
              {org.members.length === 1 ? "membro ativo" : "membros ativos"}
            </span>
          </span>
        }
        actions={<OrgEditDialog orgId={org.orgId} initialName={org.name ?? ""} />}
      />

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Membros</CardTitle>
          </CardHeader>
          <CardContent>
            {org.members.length === 0 ? (
              <EmptyState title="Nenhum membro ativo" />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Email</TH>
                    <TH>Papel</TH>
                    <TH>Concedido em</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {org.members.map((m) => (
                    <TR key={m.membershipId}>
                      <TD>
                        {m.email ?? <span className="text-muted-foreground">sem email</span>}
                      </TD>
                      <TD>
                        <Badge variant="muted">{m.roleSlug}</Badge>
                      </TD>
                      <TD className="text-muted-foreground">{formatDate(m.createdAt)}</TD>
                      <TD className="text-right">
                        <Link
                          href={`/users/${m.userId}`}
                          className="text-primary hover:underline"
                        >
                          Gerenciar via usuário
                        </Link>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planos</CardTitle>
          </CardHeader>
          <CardContent>
            <OrgPlansSection
              orgId={org.orgId}
              appSlug={org.appSlug}
              subscriptions={org.subscriptions}
              availablePlans={availablePlans}
            />
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
