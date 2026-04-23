import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { MembershipsTable } from "@/components/MembershipsTable";
import { AuditList } from "@/components/AuditList";
import { getCallerJwt } from "@/lib/auth";
import { getUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function UserDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const user = await getUser({ callerJwt: jwt, userId: id });
  if (!user) notFound();

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">{user.email}</h1>
        <p className="text-muted-foreground text-sm">
          Criado em {new Date(user.created_at).toLocaleString("pt-BR")}
          {user.is_super_admin && <span className="ml-2 text-primary">· super-admin</span>}
        </p>
      </header>

      <section className="space-y-6">
        <div>
          <h2 className="font-display text-lg mb-2">Memberships</h2>
          <MembershipsTable memberships={user.memberships} />
        </div>

        <div>
          <h2 className="font-display text-lg mb-2">Eventos recentes</h2>
          <AuditList events={user.recentAudit} />
        </div>

        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-sm text-muted-foreground">
            Ações (promover, conceder membership, impersonar, force_logout) chegam em E.3b e E.3c.
          </p>
        </div>
      </section>
    </AdminShell>
  );
}
