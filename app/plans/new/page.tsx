import { AdminShell } from "@/components/AdminShell";
import { PlanForm } from "@/components/PlanForm";
import { PageHeader } from "@/components/ui/page-header";
import { getCallerJwt } from "@/lib/auth";
import { listApps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-sm text-destructive">Sessão inválida. Faça login novamente.</p>
      </AdminShell>
    );
  }

  const apps = await listApps({ callerJwt: jwt });

  return (
    <AdminShell>
      <div className="max-w-2xl">
        <PageHeader
          title="Novo plano"
          subtitle="O slug é imutável depois de criado. O plano cria automaticamente Stripe Product + Price (exceto periodicidade custom)."
          breadcrumbs={[{ label: "Planos", href: "/plans" }, { label: "Novo plano" }]}
        />
        <PlanForm mode="create" apps={apps} />
      </div>
    </AdminShell>
  );
}
