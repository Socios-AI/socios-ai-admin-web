import { AdminShell } from "@/components/AdminShell";
import { OrgListTable } from "@/components/OrgListTable";
import { getCallerJwt } from "@/lib/auth";
import { listOrgs, listApps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OrgsPage(props: {
  searchParams: Promise<{ app?: string | string[] }>;
}) {
  const { app: appParam } = await props.searchParams;
  const app = Array.isArray(appParam) ? appParam[0] : appParam;

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const [orgs, apps] = await Promise.all([
    listOrgs({ callerJwt: jwt, app }),
    listApps({ callerJwt: jwt }),
  ]);

  return (
    <AdminShell>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl">Organizações</h1>
          <p className="text-muted-foreground text-sm">{orgs.length} no total</p>
        </div>
        <form method="GET" className="flex items-center gap-2">
          <label htmlFor="app-filter" className="text-sm text-muted-foreground">
            Filtrar por app:
          </label>
          <select
            id="app-filter"
            name="app"
            defaultValue={app ?? ""}
            className="rounded-lg border border-input bg-background px-3 py-1 text-sm"
          >
            <option value="">Todos</option>
            {apps.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-input bg-background px-3 py-1 text-sm hover:bg-muted"
          >
            Aplicar
          </button>
        </form>
      </header>

      <OrgListTable orgs={orgs} />
    </AdminShell>
  );
}
