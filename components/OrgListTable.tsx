import Link from "next/link";
import type { OrgListing } from "@/lib/data";

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

export function OrgListTable({ orgs }: { orgs: OrgListing[] }) {
  if (orgs.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-10 bg-card text-center">
        <p className="text-muted-foreground text-sm">
          Nenhuma organização ainda. Orgs aparecem aqui quando o primeiro membership é
          concedido em /users/[id].
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left">
          <tr>
            <th className="px-4 py-3 font-medium">App</th>
            <th className="px-4 py-3 font-medium">Org ID</th>
            <th className="px-4 py-3 font-medium">Membros ativos</th>
            <th className="px-4 py-3 font-medium">Primeira atividade</th>
            <th className="px-4 py-3 font-medium">Última atividade</th>
            <th className="px-4 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o, i) => (
            <tr
              key={`${o.orgId}-${o.appSlug}`}
              className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
            >
              <td className="px-4 py-3">{o.appSlug}</td>
              <td className="px-4 py-3 font-mono" title={o.orgId}>
                {shortId(o.orgId)}
              </td>
              <td className="px-4 py-3">{o.activeMembers}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDateTime(o.firstSeen)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDateTime(o.lastActivity)}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/orgs/${o.orgId}?app=${encodeURIComponent(o.appSlug)}`}
                  className="text-primary hover:underline"
                >
                  Abrir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
