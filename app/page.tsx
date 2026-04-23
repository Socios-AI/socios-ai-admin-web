import { AdminShell } from "@/components/AdminShell";
import { getCallerClaims } from "@/lib/auth";
import { listUsers } from "@/lib/data";
import { getCallerJwt } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const claims = await getCallerClaims();
  const jwt = await getCallerJwt();
  let total = 0;
  if (jwt) {
    try {
      const result = await listUsers({ callerJwt: jwt, limit: 1 });
      total = result.total;
    } catch {
      total = -1;
    }
  }
  return (
    <AdminShell>
      <header className="mb-8">
        <h1 className="font-display font-semibold text-2xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Bem-vindo, {claims?.email ?? "admin"}.
        </p>
      </header>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border p-5 bg-card">
          <p className="text-muted-foreground text-sm">Usuários no sistema</p>
          <p className="font-display font-semibold text-3xl mt-2">{total === -1 ? "n/d" : total}</p>
        </div>
        <div className="rounded-2xl border border-border p-5 bg-card text-muted-foreground">
          <p className="text-sm">Memberships ativas</p>
          <p className="font-display font-semibold text-3xl mt-2">n/d</p>
          <p className="text-xs mt-1">Em breve (E.3b)</p>
        </div>
        <div className="rounded-2xl border border-border p-5 bg-card text-muted-foreground">
          <p className="text-sm">Impersonações ativas</p>
          <p className="font-display font-semibold text-3xl mt-2">n/d</p>
          <p className="text-xs mt-1">Em breve (E.3c)</p>
        </div>
      </section>
    </AdminShell>
  );
}
