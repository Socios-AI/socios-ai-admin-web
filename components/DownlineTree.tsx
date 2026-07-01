import Link from "next/link";
import type { SubtreeNode } from "@/lib/data";
import type { PartnerStatus } from "@/lib/partners";
import { PartnerStatusBadge } from "./PartnerStatusBadge";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

const ROLE_LABEL: Record<SubtreeNode["role"], string> = {
  licenciado: "Licenciado",
  representante: "Representante",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};

const ROLE_VARIANT: Record<SubtreeNode["role"], BadgeVariant> = {
  licenciado: "warning",
  representante: "navy",
  embaixador: "success",
  afiliado: "sky",
};

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
    return <EmptyState title="Nenhum parceiro na rede ainda." />;
  }
  return (
    <Table>
      <THead>
        <TR>
          <TH>Parceiro</TH>
          <TH>Papel</TH>
          <TH>Status</TH>
          <TH className="text-right">Taxa p/ acima</TH>
          <TH className="text-right">Ganho acumulado</TH>
          <TH className="text-right">Diretos</TH>
          <TH />
        </TR>
      </THead>
      <TBody>
        {nodes.map((n) => {
          const profile = n.user_id ? profiles.get(n.user_id) : null;
          const label = profile?.full_name || profile?.email || "(sem usuário)";
          return (
            <TR key={n.partner_id} className="hover:bg-muted/30">
              <TD>
                <div className="flex items-center" style={{ paddingLeft: `${n.depth * 20}px` }}>
                  {n.depth > 0 ? (
                    <span className="mr-1 text-muted-foreground" aria-hidden="true">
                      └
                    </span>
                  ) : null}
                  <span className="font-medium">{label}</span>
                </div>
              </TD>
              <TD>
                <Badge variant={ROLE_VARIANT[n.role]}>{ROLE_LABEL[n.role]}</Badge>
              </TD>
              <TD>
                <PartnerStatusBadge status={n.status as PartnerStatus} />
              </TD>
              <TD className="text-right tabular-nums text-muted-foreground">{fmtRate(n.rate_to_parent)}</TD>
              <TD className="text-right tabular-nums">{fmtEarned(n.earned)}</TD>
              <TD className="text-right tabular-nums text-muted-foreground">{n.child_count}</TD>
              <TD className="text-right">
                <Link href={`/partners/${n.partner_id}`} className="text-primary hover:underline">
                  abrir
                </Link>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
