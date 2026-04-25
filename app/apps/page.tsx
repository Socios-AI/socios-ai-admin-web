import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { AppListTable } from "@/components/AppListTable";
import { getCallerJwt } from "@/lib/auth";
import { listAppsCatalog } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida. Faça login novamente.</p>
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Apps</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de aplicações do ecossistema. Cada app expõe seus próprios papéis internos via JWT.
          </p>
        </div>
        <Link
          href="/apps/new"
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Novo app
        </Link>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível carregar a lista. {error}
        </div>
      ) : (
        <AppListTable rows={rows} />
      )}
    </AdminShell>
  );
}
