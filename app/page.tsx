import Link from "next/link";
import { Users, Building2, Handshake, Receipt, FileText, ArrowRight } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { getCallerClaims, getCallerJwt } from "@/lib/auth";
import { listUsers } from "@/lib/data";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/users", label: "Usuários", description: "Contas, tiers e acesso.", Icon: Users },
  { href: "/orgs", label: "Organizações", description: "Tenants e membros.", Icon: Building2 },
  { href: "/partners", label: "Parceiros", description: "Rede e convites.", Icon: Handshake },
  { href: "/commissions", label: "Comissões", description: "Ledger e repasses.", Icon: Receipt },
  { href: "/audit", label: "Auditoria", description: "Eventos do sistema.", Icon: FileText },
];

export default async function DashboardPage() {
  const [claims, jwt] = await Promise.all([getCallerClaims(), getCallerJwt()]);
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
      <PageHeader
        title="Dashboard"
        subtitle={`Bem-vindo, ${claims?.email ?? "admin"}.`}
      />

      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Usuários no sistema"
            value={total === -1 ? "n/d" : total}
          />
        </section>

        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Atalhos
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map(({ href, label, description, Icon }) => (
              <Link key={href} href={href} className="group">
                <Card className="flex h-full items-center gap-4 p-5 transition-colors hover:bg-muted/50">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-foreground">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
