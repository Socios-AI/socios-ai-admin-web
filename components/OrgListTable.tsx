"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import type { OrgListing } from "@/lib/data";

type AppOption = { slug: string; name: string };

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

export function OrgListTable({ orgs, apps }: { orgs: OrgListing[]; apps: AppOption[] }) {
  const appLabel = new Map(apps.map((a) => [a.slug, a.name]));

  const columns: Column<OrgListing>[] = [
    {
      key: "name",
      header: "Cliente",
      sortAccessor: (o) => o.name ?? "",
      cell: (o) => (
        <div>
          <div className="font-medium text-foreground">{o.name ?? "Sem nome"}</div>
          <div className="text-xs text-muted-foreground font-mono" title={o.orgId}>
            {o.slug ? `${o.slug} · ${shortId(o.orgId)}` : shortId(o.orgId)}
          </div>
        </div>
      ),
    },
    {
      key: "app",
      header: "App",
      sortAccessor: (o) => appLabel.get(o.appSlug) ?? o.appSlug,
      filter: {
        label: "App",
        options: apps.map((a) => ({ label: a.name, value: a.slug })),
        accessor: (o) => o.appSlug,
      },
      cell: (o) => <Badge variant="muted">{appLabel.get(o.appSlug) ?? o.appSlug}</Badge>,
    },
    {
      key: "members",
      header: "Membros ativos",
      align: "right",
      sortAccessor: (o) => o.activeMembers,
      cell: (o) => o.activeMembers,
    },
    {
      key: "firstSeen",
      header: "Primeira atividade",
      sortAccessor: (o) => new Date(o.firstSeen).getTime(),
      cell: (o) => (
        <span className="text-muted-foreground">{formatDateTime(o.firstSeen)}</span>
      ),
    },
    {
      key: "lastActivity",
      header: "Última atividade",
      sortAccessor: (o) => new Date(o.lastActivity).getTime(),
      cell: (o) => (
        <span className="text-muted-foreground">{formatDateTime(o.lastActivity)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (o) => (
        <Link
          href={`/orgs/${o.orgId}?app=${encodeURIComponent(o.appSlug)}`}
          className={buttonClasses({ variant: "outline", size: "sm" })}
        >
          Abrir
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={orgs}
      getRowId={(o) => `${o.orgId}-${o.appSlug}`}
      search={(o) => `${o.name ?? ""} ${o.slug ?? ""}`}
      searchPlaceholder="Buscar por nome ou slug…"
      initialSort={{ key: "lastActivity", dir: "desc" }}
      pageSize={25}
      empty={
        <EmptyState
          icon={<Building2 />}
          title="Nenhuma organização ainda"
          description="Orgs aparecem aqui quando o primeiro membership é concedido em /users/[id] ou ao cadastrar um novo cliente."
        />
      }
    />
  );
}
