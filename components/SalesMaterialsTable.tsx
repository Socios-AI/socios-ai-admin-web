"use client";

import { useRouter } from "next/navigation";
import { Check, Minus } from "lucide-react";
import type { SalesMaterialRow, SalesMaterialAssetType } from "@/lib/data";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

const TYPE_LABEL: Record<SalesMaterialAssetType, string> = {
  pdf: "PDF",
  video: "Vídeo",
  banner: "Banner",
  pitch_deck: "Pitch deck",
  other: "Material",
};

const TYPE_OPTIONS = (
  Object.keys(TYPE_LABEL) as SalesMaterialAssetType[]
).map((value) => ({ value, label: TYPE_LABEL[value] }));

const columns: Column<SalesMaterialRow>[] = [
  {
    key: "title",
    header: "Título",
    cell: (row) => (
      <div>
        <span className="font-medium">{row.title}</span>
        {row.description ? (
          <span className="ml-2 text-xs text-muted-foreground">
            {row.description.length > 60
              ? `${row.description.slice(0, 60)}…`
              : row.description}
          </span>
        ) : null}
      </div>
    ),
    sortAccessor: (row) => row.title.toLowerCase(),
  },
  {
    key: "asset_type",
    header: "Tipo",
    cell: (row) => <Badge variant="muted">{TYPE_LABEL[row.asset_type]}</Badge>,
    filter: {
      label: "Tipo",
      options: TYPE_OPTIONS,
      accessor: (row) => row.asset_type,
    },
  },
  {
    key: "app_slug",
    header: "App",
    cell: (row) =>
      row.app_slug ? (
        <span className="font-mono text-xs">{row.app_slug}</span>
      ) : (
        <span className="text-xs text-muted-foreground">Geral</span>
      ),
  },
  {
    key: "is_active",
    header: "Visível",
    cell: (row) =>
      row.is_active ? (
        <Check className="h-4 w-4 text-foreground" aria-label="Sim" />
      ) : (
        <Minus className="h-4 w-4 text-muted-foreground" aria-label="Oculto" />
      ),
    align: "center",
  },
];

export function SalesMaterialsTable({ rows }: { rows: SalesMaterialRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      search={(row) => `${row.title} ${row.description ?? ""} ${row.app_slug ?? ""}`}
      searchPlaceholder="Buscar material…"
      initialSort={{ key: "title", dir: "asc" }}
      onRowClick={(row) => router.push(`/materials/${row.id}/edit`)}
      empty={<EmptyState title="Nenhum material cadastrado ainda." />}
    />
  );
}
