import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { PlanListTable } from "@/components/PlanListTable";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { getCallerJwt } from "@/lib/auth";
import { listPlansCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-sm text-destructive">Sessão inválida. Faça login novamente.</p>
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
      <PageHeader
        title="Planos"
        subtitle="Catálogo de planos contratáveis. Cada plano libera um ou mais apps via claim no JWT."
        actions={
          <Link href="/plans/new" className={buttonClasses({ variant: "primary" })}>
            Novo plano
          </Link>
        }
      />

      {error ? (
        <Card className="border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível carregar a lista. {error}
        </Card>
      ) : (
        <PlanListTable rows={rows} />
      )}
    </AdminShell>
  );
}
