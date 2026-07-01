import Link from "next/link";
import { notFound } from "next/navigation";
import { RegistrarOrgNameEdit } from "@/components/RegistrarOrgNameEdit";
import { RegistrarOrgAdminEmailEdit } from "@/components/RegistrarOrgAdminEmailEdit";
import { RegistrarMemberNameEdit } from "@/components/RegistrarMemberNameEdit";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { loadOrgForRegistrar } from "@/lib/data-registrar";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Detalhe curado do cadastrador: nome editável (inline) + membros read-only,
// com o e-mail do admin editável inline. Sem seção Planos, sem cifras, sem link
// "Gerenciar via usuário" (/users/<id> é bloqueado pro registrar).
export async function RegistrarOrgDetailView({ orgId }: { orgId: string }) {
  const org = await loadOrgForRegistrar(orgId);
  if (!org) notFound();

  return (
    <>
      <div className="mb-6">
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Link href="/orgs" className="hover:text-foreground transition-colors">
            Organizações
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground">{org.name}</span>
        </nav>
        <RegistrarOrgNameEdit orgId={org.id} initialName={org.name} />
        <p className="text-muted-foreground text-sm font-mono mt-1">
          {org.slug} · {org.id.slice(0, 8)}
        </p>
        <p className="text-muted-foreground text-sm">
          Nicho: {org.niche ?? "(sem nicho)"} · criado em {formatDate(org.createdAt)}
        </p>
      </div>

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
                  <TH>App</TH>
                  <TH>Papel</TH>
                  <TH>Nome</TH>
                  <TH>E-mail</TH>
                  <TH>Concedido em</TH>
                </TR>
              </THead>
              <TBody>
                {org.members.map((m, i) => (
                  <TR key={`${m.appSlug}-${i}`}>
                    <TD>
                      <Badge variant="muted">{m.appSlug}</Badge>
                    </TD>
                    <TD>{m.roleSlug}</TD>
                    <TD>
                      {m.userId ? (
                        <RegistrarMemberNameEdit userId={m.userId} initialName={m.name ?? ""} />
                      ) : (
                        <span className="text-muted-foreground">(sem usuário)</span>
                      )}
                    </TD>
                    <TD>
                      {m.isAdmin && m.userId && m.appCanInvite ? (
                        <RegistrarOrgAdminEmailEdit
                          orgId={org.id}
                          appSlug={m.appSlug}
                          initialEmail={m.email ?? ""}
                        />
                      ) : (
                        m.email ?? <span className="text-muted-foreground">sem email</span>
                      )}
                    </TD>
                    <TD className="text-muted-foreground">{formatDate(m.grantedAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
