"use client";

import type { LedgerEntry } from "@/lib/data";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_LABEL: Record<string, string> = {
  earned: "Apurado",
  pending: "Pendente",
  paid: "Pago",
  reversed: "Revertido",
  void: "Anulado",
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  earned: "success",
  pending: "warning",
  paid: "sky",
  reversed: "destructive",
  void: "muted",
};

function fmtMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

function fmtDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("pt-BR");
}

export function LedgerTable({
  entries,
  labels,
}: {
  entries: LedgerEntry[];
  labels: Map<string, string>;
}) {
  const columns: Column<LedgerEntry>[] = [
    {
      key: "date",
      header: "Data",
      cell: (e) => (
        <span className="text-muted-foreground">{fmtDate(e.occurred_at ?? e.created_at)}</span>
      ),
      sortAccessor: (e) => e.occurred_at ?? e.created_at ?? "",
    },
    {
      key: "beneficiary",
      header: "Beneficiário",
      cell: (e) =>
        e.is_platform_root
          ? "Sócios AI (raiz)"
          : (e.beneficiary_partner_id ? labels.get(e.beneficiary_partner_id) : null) ?? "—",
    },
    {
      key: "origin",
      header: "Origem",
      cell: (e) => (
        <span className="text-muted-foreground">
          {e.revenue_kind === "entry_fee" ? "Taxa de entrada" : "Assinatura"}
        </span>
      ),
    },
    {
      key: "depth",
      header: "Nível",
      cell: (e) => <span className="tabular-nums text-muted-foreground">{e.depth}</span>,
      sortAccessor: (e) => e.depth,
      align: "right",
    },
    {
      key: "amount",
      header: "Valor",
      cell: (e) => (
        <span className="font-medium tabular-nums">{fmtMoney(e.amount, e.currency)}</span>
      ),
      sortAccessor: (e) => e.amount,
      align: "right",
    },
    {
      key: "owed_by",
      header: "Paga",
      cell: (e) => (
        <span className="text-muted-foreground">
          {e.owed_by === "platform" ? "Plataforma" : "Licenciado"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (e) => (
        <Badge variant={STATUS_VARIANT[e.status] ?? "muted"}>
          {STATUS_LABEL[e.status] ?? e.status}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={entries}
      getRowId={(e) => e.id}
      initialSort={{ key: "date", dir: "desc" }}
      empty={<EmptyState title="Nenhum lançamento de comissão." />}
    />
  );
}
