import Link from "next/link";
import type { SubtreeNode } from "@/lib/data";
import type { PartnerStatus } from "@/lib/partners";
import { PartnerStatusBadge } from "./PartnerStatusBadge";

const ROLE_LABEL: Record<SubtreeNode["role"], string> = {
  licenciado: "Licenciado",
  representante: "Representante",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};

const ROLE_CLASS: Record<SubtreeNode["role"], string> = {
  licenciado: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300",
  representante: "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300",
  embaixador: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
  afiliado: "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300",
};

function RoleBadge({ role }: { role: SubtreeNode["role"] }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${ROLE_CLASS[role]}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}

function fmtRate(rate: number | null): string {
  if (rate == null) return "não def.";
  return `${(rate * 100).toFixed(1)}%`;
}

function fmtEarned(earned: Record<string, number>): string {
  const entries = Object.entries(earned ?? {});
  if (entries.length === 0) return "—";
  // Nunca somar entre moedas: mostra um chip por moeda.
  return entries
    .map(([cur, amt]) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur.toUpperCase() }).format(amt),
    )
    .join(" · ");
}

export function DownlineTree({
  nodes,
  profiles,
}: {
  nodes: SubtreeNode[];
  profiles: Map<string, { email: string; full_name: string | null }>;
}) {
  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nenhum parceiro na rede ainda.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Parceiro</th>
            <th className="px-4 py-3">Papel</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Taxa p/ acima</th>
            <th className="px-4 py-3">Ganho acumulado</th>
            <th className="px-4 py-3">Diretos</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((n) => {
            const profile = n.user_id ? profiles.get(n.user_id) : null;
            const label = profile?.full_name || profile?.email || "(sem usuário)";
            return (
              <tr key={n.partner_id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center" style={{ paddingLeft: `${n.depth * 20}px` }}>
                    {n.depth > 0 ? (
                      <span className="mr-1 text-muted-foreground" aria-hidden="true">
                        └
                      </span>
                    ) : null}
                    <span className="font-medium">{label}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={n.role} />
                </td>
                <td className="px-4 py-3">
                  <PartnerStatusBadge status={n.status as PartnerStatus} />
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmtRate(n.rate_to_parent)}</td>
                <td className="px-4 py-3 tabular-nums">{fmtEarned(n.earned)}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{n.child_count}</td>
                <td className="px-4 py-3">
                  <Link href={`/partners/${n.partner_id}`} className="text-primary hover:underline">
                    abrir
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
