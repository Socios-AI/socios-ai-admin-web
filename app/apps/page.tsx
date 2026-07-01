import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { AppListTable } from "@/components/AppListTable";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { getCallerJwt } from "@/lib/auth";
import { listAppsCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-sm text-destructive">Sessão inválida. Faça login novamente.</p>
      </AdminShell>
    );
  }

  let rows: Awaited<ReturnType<typeof listAppsCatalog>> = [];
  let error: string | null = null;
  try {
    rows = await listAppsCatalog({ callerJwt: jwt });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <AdminShell>
      <PageHeader
        title="Apps"
        subtitle="Catálogo de aplicações do ecossistema. Cada app expõe seus próprios papéis internos via JWT."
        actions={
          <Link href="/apps/new" className={buttonClasses({ variant: "primary" })}>
            Novo app
          </Link>
        }
      />

      {error ? (
        <Card className="border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Não foi possível carregar a lista. {error}
        </Card>
      ) : (
        <AppListTable rows={rows} />
      )}
    </AdminShell>
  );
}
