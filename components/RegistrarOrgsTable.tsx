"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";
import type { RegistrarClient } from "@/lib/data-registrar";

function shortId(id: string): string {
  return id.slice(0, 8);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Nichos distintos do cliente, na ordem em que aparecem (mais recente primeiro).
function distinctNiches(c: RegistrarClient): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of c.orgs) {
    if (o.niche && !seen.has(o.niche)) {
      seen.add(o.niche);
      out.push(o.niche);
    }
  }
  return out;
}

const columns: Column<RegistrarClient>[] = [
  {
    key: "name",
    header: "Cliente",
    sortAccessor: (c) => c.name.toLowerCase(),
    cell: (c) =>
      c.orgs.length === 1 ? (
        <Link href={`/orgs/${c.orgs[0].orgId}`} className="group block">
          <span className="font-medium text-foreground group-hover:underline">{c.name}</span>
          <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
            - {shortId(c.orgs[0].orgId)}
          </span>
        </Link>
      ) : (
        <span className="block">
          <span className="font-medium text-foreground">{c.name}</span>
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            · {c.orgs.length} cadastros
          </span>
        </span>
      ),
  },
  {
    key: "niches",
    header: "Nichos",
    width: "18rem",
    sortAccessor: (c) => distinctNiches(c)[0] ?? "",
    cell: (c) => {
      const niches = distinctNiches(c);
      if (niches.length === 0) {
        return <span className="text-muted-foreground">(sem nicho)</span>;
      }
      return (
        <span className="flex flex-wrap items-center gap-1.5">
          {niches.map((n) => (
            <Badge key={n} variant="muted">
              {n}
            </Badge>
          ))}
        </span>
      );
    },
  },
  {
    key: "created",
    header: "Criado",
    width: "9rem",
    sortAccessor: (c) => c.createdAt,
    cell: (c) => <span className="text-muted-foreground">{formatDate(c.createdAt)}</span>,
  },
];

export function RegistrarOrgsTable({ clients }: { clients: RegistrarClient[] }) {
  return (
    <DataTable
      columns={columns}
      data={clients}
      getRowId={(c) => c.key}
      search={(c) =>
        `${c.name} ${distinctNiches(c).join(" ")} ${c.orgs.map((o) => shortId(o.orgId)).join(" ")}`
      }
      searchPlaceholder="Buscar por nome…"
      initialSort={{ key: "created", dir: "desc" }}
      pageSize={25}
      // Clientes com mais de um cadastro expandem para ver cada org/nicho; os de
      // cadastro único não (a linha já leva direto pra org).
      renderSubRow={(c) => (c.orgs.length > 1 ? <ClientOrgsBreakdown client={c} /> : null)}
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

function ClientOrgsBreakdown({ client }: { client: RegistrarClient }) {
  return (
    <div className="pl-12 pr-4 pb-3 pt-1">
      <p className="py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Cadastros deste cliente
      </p>
      <div className="divide-y divide-border/60">
        {client.orgs.map((o) => (
          <div
            key={o.orgId}
            className="grid grid-cols-1 items-center gap-2 py-2.5 sm:grid-cols-[minmax(160px,1fr)_auto_auto] sm:gap-6"
          >
            {o.niche ? (
              <Badge variant="muted">{o.niche}</Badge>
            ) : (
              <span className="text-muted-foreground">(sem nicho)</span>
            )}
            <span className="font-mono text-xs text-muted-foreground">{shortId(o.orgId)}</span>
            <div className="flex justify-end">
              <Link
                href={`/orgs/${o.orgId}`}
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
