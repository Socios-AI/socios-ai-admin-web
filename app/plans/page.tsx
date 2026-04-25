import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { PlanListTable } from "@/components/PlanListTable";
import { getCallerJwt } from "@/lib/auth";
import { listPlansCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida. Faça login novamente.</p>
      </AdminShell>
    );
  }

  let rows: Awaited<ReturnType<typeof listPlansCatalog>> = [];
  let error: string | null = null;
  try {
    rows = await listPlansCatalog({ callerJwt: jwt });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Planos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de planos contratáveis. Cada plano libera um ou mais apps via claim no JWT.
          </p>
        </div>
        <Link
          href="/plans/new"
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Novo plano
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar a lista. {error}
        </div>
      ) : (
        <PlanListTable rows={rows} />
      )}
    </AdminShell>
  );
}
