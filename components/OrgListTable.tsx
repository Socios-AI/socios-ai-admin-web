"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import type { OrgListing } from "@/lib/data";

type AppOption = { slug: string; name: string };

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR");
}

// Cor do chip por app. Platform fica neutro; os demais recebem uma cor estável
// derivada do slug, sempre com bom contraste (variantes já usam text-foreground).
const APP_PALETTE: BadgeVariant[] = ["purple", "sky", "lime", "warning", "navy"];
function appVariant(slug: string): BadgeVariant {
  if (slug === "platform") return "muted";
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash + slug.charCodeAt(i)) % APP_PALETTE.length;
  return APP_PALETTE[hash];
}

export function OrgListTable({ orgs, apps }: { orgs: OrgListing[]; apps: AppOption[] }) {
  const appLabel = new Map(apps.map((a) => [a.slug, a.name]));
  const label = (slug: string) => appLabel.get(slug) ?? slug;

  const columns: Column<OrgListing>[] = [
    {
      key: "name",
      header: "Cliente",
      sortAccessor: (o) => (o.name ?? shortId(o.orgId)).toLowerCase(),
      cell: (o) => (
        <span className="font-medium text-foreground">
          {o.name ?? "Sem nome"}
          <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
            - {shortId(o.orgId)}
          </span>
        </span>
      ),
    },
    {
      key: "apps",
      header: "Apps com acesso",
      filter: {
        label: "App",
        options: apps.map((a) => ({ label: a.name, value: a.slug })),
        accessor: (o) => o.apps.map((a) => a.appSlug),
      },
      cell: (o) => (
        <span className="flex flex-wrap items-center gap-1.5">
          {o.apps.map((a) => (
            <Badge key={a.appSlug} variant={appVariant(a.appSlug)}>
              {label(a.appSlug)}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      key: "members",
      header: "Membros",
      align: "right",
      sortAccessor: (o) => o.activeMembers,
      cell: (o) => o.activeMembers,
    },
    {
      key: "lastActivity",
      header: "Última atividade",
      sortAccessor: (o) => new Date(o.lastActivity).getTime(),
      cell: (o) => <span className="text-muted-foreground">{formatDate(o.lastActivity)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (o) => (
        // Abre no contexto do app mais recente (a org é vista sempre por app).
        <Link
          href={`/orgs/${o.orgId}?app=${encodeURIComponent(o.apps[0]?.appSlug ?? "")}`}
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
      getRowId={(o) => o.orgId}
      search={(o) =>
        `${o.name ?? ""} ${shortId(o.orgId)} ${o.apps.map((a) => label(a.appSlug)).join(" ")}`
      }
      searchPlaceholder="Buscar por nome…"
      initialSort={{ key: "lastActivity", dir: "desc" }}
      pageSize={25}
      // Orgs com mais de um app expandem para o detalhe por app; as de app único não.
      renderSubRow={(o) => (o.apps.length > 1 ? <OrgAppBreakdown org={o} label={label} /> : null)}
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

function OrgAppBreakdown({
  org,
  label,
}: {
  org: OrgListing;
  label: (slug: string) => string;
}) {
  return (
    <div className="pl-12 pr-4 pb-3 pt-1">
      <p className="py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Detalhe por app
      </p>
      <div className="divide-y divide-border/60">
        {org.apps.map((a) => (
          <div
            key={a.appSlug}
            className="grid grid-cols-1 items-center gap-2 py-2.5 sm:grid-cols-[minmax(160px,1fr)_auto_auto_auto] sm:gap-6"
          >
            <Badge variant={appVariant(a.appSlug)}>{label(a.appSlug)}</Badge>
            <Detail label="Membros">{a.activeMembers}</Detail>
            <Detail label="Primeira atividade">{formatDateTime(a.firstSeen)}</Detail>
            <div className="flex items-center justify-between gap-6">
              <Detail label="Última atividade">{formatDateTime(a.lastActivity)}</Detail>
              <Link
                href={`/orgs/${org.orgId}?app=${encodeURIComponent(a.appSlug)}`}
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                Abrir
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
