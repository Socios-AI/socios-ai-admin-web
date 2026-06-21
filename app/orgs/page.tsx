import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { OrgListTable } from "@/components/OrgListTable";
import { RegistrarOrgsView } from "@/components/RegistrarOrgsView";
import { getCallerJwt, getCallerClaims } from "@/lib/auth";
import { listOrgs, listApps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OrgsPage(props: {
  searchParams: Promise<{ app?: string | string[] }>;
}) {
  const { app: appParam } = await props.searchParams;
  const app = Array.isArray(appParam) ? appParam[0] : appParam;

  // Cadastrador (registrar, não super_admin): view curada sem financeiro.
  const claims = await getCallerClaims();
  if (claims?.tier === "registrar" && claims?.super_admin !== true) {
    return (
      <AdminShell>
        <RegistrarOrgsView />
      </AdminShell>
    );
  }

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
        <div className="flex items-center gap-3">
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
          <Link
            href="/orgs/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Novo cliente
          </Link>
        </div>
      </header>

      <OrgListTable orgs={orgs} />
    </AdminShell>
  );
}
