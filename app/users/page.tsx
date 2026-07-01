import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { UserListTable } from "@/components/UserListTable";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, buttonClasses } from "@/components/ui/button";
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
      <PageHeader
        title="Usuários"
        subtitle={error ? "Erro ao carregar." : `${total} no total`}
        actions={
          <>
            <form action="/users" method="get" className="flex gap-2">
              <Input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Buscar por email…"
                className="w-56"
              />
              <button type="submit" className={buttonClasses({ variant: "secondary" })}>
                Buscar
              </button>
            </form>
            <Link href="/users/new" className={buttonClasses({ variant: "primary" })}>
              Convidar usuário
            </Link>
          </>
        }
      />

      {error ? (
        <Card className="border-destructive/50 bg-destructive/5 p-6">
          <p className="text-destructive font-medium">Não foi possível carregar a lista.</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <UserListTable rows={rows} />

          {totalPages > 1 ? (
            <nav className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>
                Página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={`/users?q=${encodeURIComponent(q)}&page=${page - 1}`}
                    className={buttonClasses({ variant: "outline", size: "sm" })}
                  >
                    Anterior
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Anterior
                  </Button>
                )}
                {page < totalPages ? (
                  <Link
                    href={`/users?q=${encodeURIComponent(q)}&page=${page + 1}`}
                    className={buttonClasses({ variant: "outline", size: "sm" })}
                  >
                    Próxima
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Próxima
                  </Button>
                )}
              </div>
            </nav>
          ) : null}
        </div>
      )}
    </AdminShell>
  );
}
