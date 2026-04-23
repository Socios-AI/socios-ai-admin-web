import Link from "next/link";
import type { UserRow } from "@/lib/data";

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
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Memberships</th>
            <th className="px-4 py-3 font-medium">Super-admin</th>
            <th className="px-4 py-3 font-medium">Criado em</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              <td className="px-4 py-3">
                <Link href={`/users/${row.id}`} className="hover:underline">
                  {row.email}
                </Link>
              </td>
              <td className="px-4 py-3">{row.membership_count}</td>
              <td className="px-4 py-3">{row.is_super_admin ? "Sim" : "Não"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(row.created_at).toLocaleDateString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
