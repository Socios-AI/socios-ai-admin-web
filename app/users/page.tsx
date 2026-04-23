import { AdminShell } from "@/components/AdminShell";
import { UserListTable } from "@/components/UserListTable";
import { getCallerJwt } from "@/lib/auth";
import { listUsers } from "@/lib/data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function UsersPage(props: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await props.searchParams;
  const q = sp.q ?? "";
  const page = Math.max(1, Number(sp.page ?? "1"));
  const offset = (page - 1) * PAGE_SIZE;

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida. Faça login novamente.</p>
      </AdminShell>
    );
  }

  let rows: Awaited<ReturnType<typeof listUsers>>["rows"] = [];
  let total = 0;
  let error: string | null = null;
  try {
    const result = await listUsers({ callerJwt: jwt, search: q || undefined, limit: PAGE_SIZE, offset });
    rows = result.rows;
    total = result.total;
  } catch (e) {
    error = (e as Error).message;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-semibold text-2xl">Usuários</h1>
          <p className="text-muted-foreground text-sm">
            {error ? "Erro ao carregar." : `${total} no total`}
          </p>
        </div>
        <form action="/users" method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por email..."
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary text-primary-foreground font-medium px-4 py-2 hover:opacity-90"
          >
            Buscar
          </button>
        </form>
      </header>

      {error ? (
        <div className="rounded-2xl border border-destructive bg-destructive/5 p-6">
          <p className="text-destructive font-medium">Não foi possível carregar a lista.</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      ) : (
        <UserListTable rows={rows} />
      )}

      {!error && totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/users?q=${encodeURIComponent(q)}&page=${page - 1}`}
                className="px-3 py-1.5 rounded border border-border hover:bg-muted"
              >
                Anterior
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/users?q=${encodeURIComponent(q)}&page=${page + 1}`}
                className="px-3 py-1.5 rounded border border-border hover:bg-muted"
              >
                Próxima
              </a>
            )}
          </div>
        </nav>
      )}
    </AdminShell>
  );
}
