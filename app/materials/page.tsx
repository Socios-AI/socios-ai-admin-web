import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { SalesMaterialsTable } from "@/components/SalesMaterialsTable";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { getCallerJwt } from "@/lib/auth";
import { listSalesMaterialsAdmin } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-sm text-destructive">
          Sessão inválida. Faça login novamente.
        </p>
      </AdminShell>
    );
  }

  let rows: Awaited<ReturnType<typeof listSalesMaterialsAdmin>> = [];
  let error: string | null = null;
  try {
    rows = await listSalesMaterialsAdmin({ callerJwt: jwt });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <AdminShell>
      <PageHeader
        title="Materiais"
        subtitle="Arsenal de marketing e vendas disponibilizado aos parceiros no portal."
        actions={
          <Link href="/materials/new" className={buttonClasses({ variant: "primary" })}>
            Novo material
          </Link>
        }
      />

      {error ? (
        <Card className="border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível carregar a lista. {error}
        </Card>
      ) : (
        <SalesMaterialsTable rows={rows} />
      )}
    </AdminShell>
  );
}
