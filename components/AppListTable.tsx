import Link from "next/link";
import type { AppCatalogRow } from "@/lib/data";

const STATUS_LABEL: Record<AppCatalogRow["status"], string> = {
  active: "Ativo",
  beta: "Beta",
  sunset: "Em descontinuação",
  archived: "Arquivado",
};

const STATUS_TONE: Record<AppCatalogRow["status"], string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  beta: "bg-sky-100 text-sky-800 border-sky-200",
  sunset: "bg-amber-100 text-amber-800 border-amber-200",
  archived: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export function AppListTable({ rows }: { rows: AppCatalogRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-10 bg-card text-center">
        <p className="text-muted-foreground">Nenhum app cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left">
          <tr>
            <th className="px-4 py-3 font-medium">App</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Aceita novos</th>
            <th className="px-4 py-3 font-medium">Ativo</th>
            <th className="px-4 py-3 font-medium">Memberships</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.slug} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              <td className="px-4 py-3">
                <Link href={`/apps/${row.slug}`} className="hover:underline font-medium">
                  {row.name}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground font-mono">{row.slug}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-xs ${STATUS_TONE[row.status]}`}
                >
                  {STATUS_LABEL[row.status]}
                </span>
              </td>
              <td className="px-4 py-3">{row.accepts_new_subscriptions ? "Sim" : "Não"}</td>
              <td className="px-4 py-3">{row.active ? "Sim" : "Não"}</td>
              <td className="px-4 py-3">{row.membership_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
