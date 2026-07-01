"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import type { RegistrarOrg } from "@/lib/data-registrar";

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const columns: Column<RegistrarOrg>[] = [
  {
    key: "name",
    header: "Cliente",
    sortAccessor: (o) => o.name.toLowerCase(),
    cell: (o) => (
      <Link href={`/orgs/${o.id}`} className="group block">
        <span className="font-medium text-foreground group-hover:underline">{o.name}</span>
        <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
          - {shortId(o.id)}
        </span>
      </Link>
    ),
  },
  {
    key: "niche",
    header: "Nicho",
    width: "12rem",
    sortAccessor: (o) => o.niche ?? "",
    cell: (o) =>
      o.niche ? (
        <Badge variant="muted">{o.niche}</Badge>
      ) : (
        <span className="text-muted-foreground">(sem nicho)</span>
      ),
  },
  {
    key: "created",
    header: "Criado",
    width: "9rem",
    sortAccessor: (o) => o.createdAt,
    cell: (o) => <span className="text-muted-foreground">{formatDate(o.createdAt)}</span>,
  },
];

export function RegistrarOrgsTable({ orgs }: { orgs: RegistrarOrg[] }) {
  return (
    <DataTable
      columns={columns}
      data={orgs}
      getRowId={(o) => o.id}
      search={(o) => `${o.name} ${shortId(o.id)} ${o.niche ?? ""}`}
      searchPlaceholder="Buscar por nome…"
      initialSort={{ key: "created", dir: "desc" }}
      pageSize={25}
      empty={
        <EmptyState
          icon={<Building2 />}
          title="Nenhuma organização cadastrada ainda"
          description="Cadastre o primeiro cliente para começar."
          action={
            <Link
              href="/orgs/new"
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              Novo cliente
            </Link>
          }
        />
      }
    />
  );
}
