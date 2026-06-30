import Link from "next/link";
import type { UserRow } from "@/lib/data";

const MAX_ORG_CHIPS = 3;

export function UserListTable({ rows }: { rows: UserRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-10 bg-card text-center">
        <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Pessoa</th>
            <th className="px-4 py-3 font-medium">Orgs</th>
            <th className="px-4 py-3 font-medium">Super-admin</th>
            <th className="px-4 py-3 font-medium">Criado em</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const name = row.full_name?.trim();
            const shown = row.orgs.slice(0, MAX_ORG_CHIPS);
            const extra = row.orgs.length - shown.length;
            return (
              <tr key={row.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                <td className="px-4 py-3">
                  <Link href={`/users/${row.id}`} className="group block">
                    <span className="font-medium group-hover:underline">{name || row.email}</span>
                    {name ? (
                      <span className="block text-muted-foreground text-xs">{row.email}</span>
                    ) : null}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {row.orgs.length === 0 ? (
                    <span className="text-muted-foreground">(sem org)</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {shown.map((o) => (
                        <span
                          key={o.id}
                          className="rounded-md bg-muted px-2 py-0.5 text-xs"
                          title={o.name}
                        >
                          {o.name}
                        </span>
                      ))}
                      {extra > 0 ? (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          +{extra}
                        </span>
                      ) : null}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{row.is_super_admin ? "Sim" : "Não"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(row.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
