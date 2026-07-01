"use client";

import { useRouter } from "next/navigation";
import { Check, Minus } from "lucide-react";
import type { AppCatalogRow } from "@/lib/data";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_LABEL: Record<AppCatalogRow["status"], string> = {
  active: "Ativo",
  beta: "Beta",
  sunset: "Em descontinuação",
  archived: "Arquivado",
};

const STATUS_VARIANT: Record<AppCatalogRow["status"], BadgeVariant> = {
  active: "success",
  beta: "sky",
  sunset: "warning",
  archived: "muted",
};

const STATUS_OPTIONS = (
  Object.keys(STATUS_LABEL) as AppCatalogRow["status"][]
).map((value) => ({ value, label: STATUS_LABEL[value] }));

function BoolCell({ on }: { on: boolean }) {
  return on ? (
    <Check className="h-4 w-4 text-foreground" aria-label="Sim" />
  ) : (
    <Minus className="h-4 w-4 text-muted-foreground" aria-label="Não" />
  );
}

const columns: Column<AppCatalogRow>[] = [
  {
    key: "name",
    header: "App",
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
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge variant={STATUS_VARIANT[row.status]}>
        {STATUS_LABEL[row.status]}
      </Badge>
    ),
    filter: {
      label: "Status",
      options: STATUS_OPTIONS,
      accessor: (row) => row.status,
    },
  },
  {
    key: "accepts",
    header: "Aceita novos",
    cell: (row) => <BoolCell on={row.accepts_new_subscriptions} />,
    align: "center",
  },
  {
    key: "billing",
    header: "Cobrança",
    cell: (row) =>
      row.billing_paused ? (
        <Badge variant="warning">Pausada</Badge>
      ) : (
        <Badge variant="success">Ativa</Badge>
      ),
  },
  {
    key: "active",
    header: "Ativo",
    cell: (row) => <BoolCell on={row.active} />,
    align: "center",
  },
  {
    key: "memberships",
    header: "Memberships",
    cell: (row) => <span className="tabular-nums">{row.membership_count}</span>,
    sortAccessor: (row) => row.membership_count,
    align: "right",
  },
];

export function AppListTable({ rows }: { rows: AppCatalogRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.slug}
      search={(row) => `${row.name} ${row.slug}`}
      searchPlaceholder="Buscar app…"
      initialSort={{ key: "name", dir: "asc" }}
      onRowClick={(row) => router.push(`/apps/${row.slug}`)}
      empty={<EmptyState title="Nenhum app cadastrado." />}
    />
  );
}
