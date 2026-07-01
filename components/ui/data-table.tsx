"use client";

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { Input } from "./input";
import { Select } from "./select";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { Table, THead, TBody, TR, TH, TD } from "./table";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortAccessor?: (row: T) => string | number;
  filter?: {
    label: string;
    options: { label: string; value: string }[];
    accessor: (row: T) => string;
  };
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  search?: (row: T) => string;
  searchPlaceholder?: string;
  initialSort?: { key: string; dir: "asc" | "desc" };
  pageSize?: number;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  emptyFiltered?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
}

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export function DataTable<T>({
  columns,
  data,
  getRowId,
  search,
  searchPlaceholder = "Buscar…",
  initialSort,
  pageSize,
  onRowClick,
  empty,
  emptyFiltered,
  toolbarExtra,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [sort, setSort] = React.useState<{ key: string; dir: "asc" | "desc" } | null>(
    initialSort ?? null,
  );
  const [page, setPage] = React.useState(0);

  const filterCols = React.useMemo(
    () => columns.filter((c) => c.filter),
    [columns],
  );

  const processed = React.useMemo(() => {
    let rows = data;

    for (const col of filterCols) {
      const val = filters[col.key];
      if (val) rows = rows.filter((r) => col.filter!.accessor(r) === val);
    }

    if (search && query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((r) => search(r).toLowerCase().includes(q));
    }

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortAccessor) {
        const acc = col.sortAccessor;
        rows = [...rows].sort((a, b) => {
          const av = acc(a);
          const bv = acc(b);
          let cmp: number;
          if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
          else cmp = String(av).localeCompare(String(bv), "pt-BR");
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }

    return rows;
  }, [data, filterCols, filters, search, query, sort, columns]);

  const filtersActive =
    query.trim().length > 0 || Object.values(filters).some(Boolean);

  const total = processed.length;
  const pageCount = pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = pageSize
    ? processed.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : processed;

  React.useEffect(() => {
    setPage(0);
  }, [query, filters, sort]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  const hasToolbar = Boolean(search) || filterCols.length > 0 || toolbarExtra;

  return (
    <div className="space-y-3">
      {hasToolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          {search ? (
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          ) : null}
          {filterCols.map((col) => (
            <Select
              key={col.key}
              value={filters[col.key] ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, [col.key]: e.target.value }))
              }
              className="w-auto min-w-[140px]"
              aria-label={col.filter!.label}
            >
              <option value="">{col.filter!.label}: todos</option>
              {col.filter!.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          ))}
          {toolbarExtra ? <div className="ml-auto">{toolbarExtra}</div> : null}
        </div>
      ) : null}

      {total === 0 ? (
        (filtersActive ? emptyFiltered : empty) ?? (
          <EmptyState
            title={
              filtersActive
                ? "Nenhum resultado para os filtros."
                : "Nada por aqui ainda."
            }
          />
        )
      ) : (
        <Table>
          <THead>
            <TR>
              {columns.map((col) => {
                const sorted = sort?.key === col.key;
                return (
                  <TH
                    key={col.key}
                    className={cn(
                      col.align && alignClass[col.align],
                      col.headerClassName,
                    )}
                  >
                    {col.sortAccessor ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {col.header}
                        {sorted ? (
                          sort!.dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TH>
                );
              })}
            </TR>
          </THead>
          <TBody>
            {pageRows.map((row) => (
              <TR
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors",
                )}
              >
                {columns.map((col) => (
                  <TD
                    key={col.key}
                    className={cn(
                      col.align && alignClass[col.align],
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {pageSize && total > pageSize ? (
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, total)} de{" "}
            {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
