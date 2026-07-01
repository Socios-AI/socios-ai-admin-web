"use client";

import { useRouter } from "next/navigation";
import type { PlanCatalogRow } from "@/lib/data";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const PERIOD_LABEL: Record<PlanCatalogRow["billing_period"], string> = {
  monthly: "Mensal",
  yearly: "Anual",
  one_time: "Único",
  custom: "Custom",
};

const PERIOD_VARIANT: Record<PlanCatalogRow["billing_period"], BadgeVariant> = {
  monthly: "sky",
  yearly: "purple",
  one_time: "success",
  custom: "warning",
};

const PERIOD_OPTIONS = (
  Object.keys(PERIOD_LABEL) as PlanCatalogRow["billing_period"][]
).map((value) => ({ value, label: PERIOD_LABEL[value] }));

const CURRENCY_FORMATTERS: Record<PlanCatalogRow["currency"], Intl.NumberFormat> = {
  usd: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  brl: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
  eur: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }),
};

function formatPrice(amount: number, currency: PlanCatalogRow["currency"]): string {
  return CURRENCY_FORMATTERS[currency].format(amount);
}

const columns: Column<PlanCatalogRow>[] = [
  {
    key: "name",
    header: "Plano",
    cell: (row) => (
      <div>
        <span className="font-medium">{row.name}</span>
        <span className="ml-2 font-mono text-xs text-muted-foreground">
          {row.slug}
        </span>
      </div>
    ),
    sortAccessor: (row) => row.name.toLowerCase(),
  },
  {
    key: "period",
    header: "Periodicidade",
    cell: (row) => (
      <Badge variant={PERIOD_VARIANT[row.billing_period]}>
        {PERIOD_LABEL[row.billing_period]}
      </Badge>
    ),
    filter: {
      label: "Periodicidade",
      options: PERIOD_OPTIONS,
      accessor: (row) => row.billing_period,
    },
  },
  {
    key: "price",
    header: "Preço",
    cell: (row) => (
      <span className="font-mono text-xs">
        {formatPrice(row.price_amount, row.currency)}
      </span>
    ),
    sortAccessor: (row) => row.price_amount,
    align: "right",
  },
  {
    key: "apps",
    header: "Apps liberados",
    cell: (row) =>
      row.app_slugs.length === 0 ? (
        <span className="text-xs text-muted-foreground">nenhum</span>
      ) : (
        <div className="flex flex-wrap gap-1">
          {row.app_slugs.map((slug) => (
            <Badge key={slug} variant="muted" className="font-mono">
              {slug}
            </Badge>
          ))}
        </div>
      ),
  },
  {
    key: "subscribers",
    header: "Subscribers",
    cell: (row) => <span className="tabular-nums">{row.subscriber_count}</span>,
    sortAccessor: (row) => row.subscriber_count,
    align: "right",
  },
  {
    key: "state",
    header: "Estado",
    cell: (row) => (
      <div className="flex flex-wrap gap-1">
        <Badge variant={row.is_active ? "success" : "muted"}>
          {row.is_active ? "Ativo" : "Inativo"}
        </Badge>
        <Badge variant={row.is_visible ? "default" : "warning"}>
          {row.is_visible ? "Visível" : "Oculto"}
        </Badge>
      </div>
    ),
  },
];

export function PlanListTable({ rows }: { rows: PlanCatalogRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      search={(row) => `${row.name} ${row.slug}`}
      searchPlaceholder="Buscar plano…"
      initialSort={{ key: "name", dir: "asc" }}
      onRowClick={(row) => router.push(`/plans/${row.id}`)}
      empty={<EmptyState title="Nenhum plano cadastrado." />}
    />
  );
}
