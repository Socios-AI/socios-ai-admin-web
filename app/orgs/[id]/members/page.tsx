import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { OrgInvitationForm } from "@/components/OrgInvitationForm";
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
      <header className="mb-6">
        <div className="text-xs text-muted-foreground mb-1">
          <Link href="/orgs" className="hover:underline">Organizações</Link> · {org.slug}
        </div>
        <h1 className="font-display font-semibold text-2xl">{org.name}</h1>
        <p className="text-muted-foreground text-sm">
          Membros e convites · {pending.length} pendentes · {consumed.length} aceitos
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1">
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Convidar membro
            </h2>
            <OrgInvitationForm orgId={id} />
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          {pending.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Pendentes ({pending.length})
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-left">Expira</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((i) => (
                      <tr key={i.id} className="border-t border-border">
                        <td className="px-4 py-2 font-mono text-xs">{i.email}</td>
                        <td className="px-4 py-2">{i.role_slug}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {new Date(i.expires_at).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Aceitos ({consumed.length})
            </h2>
            {consumed.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum convite aceito ainda.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-left">Aceito em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumed.map((i) => (
                      <tr key={i.id} className="border-t border-border">
                        <td className="px-4 py-2 font-mono text-xs">{i.email}</td>
                        <td className="px-4 py-2">{i.role_slug}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {i.consumed_at
                            ? new Date(i.consumed_at).toLocaleString("pt-BR")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
