import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { MembershipsTable } from "@/components/MembershipsTable";
import { AuditList } from "@/components/AuditList";
import { UserActions } from "@/components/UserActions";
import { getCallerJwt } from "@/lib/auth";
import { getUser, listApps } from "@/lib/data";

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

  const [user, apps] = await Promise.all([
    getUser({ callerJwt: jwt, userId: id }),
    listApps({ callerJwt: jwt }),
  ]);
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
        <UserActions
          userId={user.id}
          email={user.email}
          isSuperAdmin={user.is_super_admin}
          memberships={user.memberships}
          apps={apps}
        />

        <div>
          <h2 className="font-display text-lg mb-2">Memberships</h2>
          <MembershipsTable memberships={user.memberships} />
        </div>

        <div>
          <h2 className="font-display text-lg mb-2">Eventos recentes</h2>
          <AuditList events={user.recentAudit} />
        </div>
      </section>
    </AdminShell>
  );
}
