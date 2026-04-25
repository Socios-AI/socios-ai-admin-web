import { AdminShell } from "@/components/AdminShell";
import { PlanForm } from "@/components/PlanForm";
import { getCallerJwt } from "@/lib/auth";
import { listApps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida. Faça login novamente.</p>
      </AdminShell>
    );
  }

  const apps = await listApps({ callerJwt: jwt });

  return (
    <AdminShell>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Novo plano</h1>
          <p className="text-sm text-muted-foreground">
            O slug é imutável depois de criado. O plano cria automaticamente Stripe Product + Price (exceto periodicidade custom).
          </p>
        </div>
        <PlanForm mode="create" apps={apps} />
      </div>
    </AdminShell>
  );
}
