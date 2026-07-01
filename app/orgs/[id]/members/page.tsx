import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { OrgInvitationForm } from "@/components/OrgInvitationForm";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getCallerJwt } from "@/lib/auth";
import { getOrg, listOrgInvitations } from "@/lib/org-invitations";

export const dynamic = "force-dynamic";

export default async function OrgMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const [org, invitations] = await Promise.all([
    getOrg({ callerJwt: jwt, orgId: id }),
    listOrgInvitations({ callerJwt: jwt, orgId: id }),
  ]);

  if (!org) notFound();

  const pending = invitations.filter((i) => i.status === "sent");
  const consumed = invitations.filter((i) => i.status === "consumed");

  return (
    <AdminShell>
      <PageHeader
        title={org.name}
        subtitle={`Membros e convites · ${pending.length} pendentes · ${consumed.length} aceitos`}
        breadcrumbs={[
          { label: "Organizações", href: "/orgs" },
          { label: org.name },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Convidar membro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OrgInvitationForm orgId={id} />
            </CardContent>
          </Card>
        </section>

        <section className="lg:col-span-2 space-y-6">
          {pending.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Pendentes ({pending.length})
              </h2>
              <Table>
                <THead>
                  <TR>
                    <TH>Email</TH>
                    <TH>Role</TH>
                    <TH>Expira</TH>
                  </TR>
                </THead>
                <TBody>
                  {pending.map((i) => (
                    <TR key={i.id}>
                      <TD className="font-mono text-xs">{i.email}</TD>
                      <TD>
                        <Badge variant="muted">{i.role_slug}</Badge>
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {new Date(i.expires_at).toLocaleString("pt-BR")}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          ) : null}

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Aceitos ({consumed.length})
            </h2>
            {consumed.length === 0 ? (
              <EmptyState title="Nenhum convite aceito ainda." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Email</TH>
                    <TH>Role</TH>
                    <TH>Aceito em</TH>
                  </TR>
                </THead>
                <TBody>
                  {consumed.map((i) => (
                    <TR key={i.id}>
                      <TD className="font-mono text-xs">{i.email}</TD>
                      <TD>
                        <Badge variant="success">{i.role_slug}</Badge>
                      </TD>
                      <TD className="text-xs text-muted-foreground">
                        {i.consumed_at
                          ? new Date(i.consumed_at).toLocaleString("pt-BR")
                          : "-"}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
