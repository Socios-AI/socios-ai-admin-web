"use client";

import Link from "next/link";
import { Users, ShieldCheck } from "lucide-react";
import type { PartnerRole, UserRow } from "@/lib/data";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";

const MAX_ORG_CHIPS = 3;

const PARTNER_LABEL: Record<PartnerRole, string> = {
  licenciado: "Licenciado",
  representante: "Revendedor",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};

const STAFF_LABEL: Record<NonNullable<UserRow["staff_tier"]>, string> = {
  owner: "Owner",
  admin: "Admin",
  registrar: "Cadastrador",
};

// Cada papel tem uma cor própria e distinta, pra leitura rápida.
// Parceiros = tints coloridos; staff interno (Cadastrador/Owner/Admin) = navy sólido.
const PARTNER_VARIANT: Record<PartnerRole, BadgeVariant> = {
  licenciado: "purple",
  representante: "sky",
  embaixador: "lime",
  afiliado: "warning",
};

const STAFF_VARIANT: Record<NonNullable<UserRow["staff_tier"]>, BadgeVariant> = {
  owner: "navy",
  admin: "navy",
  registrar: "navy",
};

const columns: Column<UserRow>[] = [
  {
    key: "person",
    header: "Pessoa",
    cell: (row) => {
      const name = row.full_name?.trim();
      return (
        <Link href={`/users/${row.id}`} className="group block">
          <span className="font-medium group-hover:underline">{name || row.email}</span>
          {row.is_super_admin ? (
            <span
              title="Super admin"
              aria-label="Super admin"
              className="ml-1.5 inline-flex align-middle text-muted-foreground"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          ) : null}
          {name ? (
            <span className="block text-muted-foreground text-xs">{row.email}</span>
          ) : null}
        </Link>
      );
    },
    sortAccessor: (row) => (row.full_name?.trim() || row.email).toLowerCase(),
  },
  {
    key: "links",
    header: "Vínculos",
    cell: (row) => {
      const shown = row.orgs.slice(0, MAX_ORG_CHIPS);
      const extra = row.orgs.length - shown.length;
      const hasAnything = row.partner_role || row.staff_tier || row.orgs.length > 0;
      return (
        <span className="flex flex-wrap items-center gap-1">
          {/* Papel de parceiro · cor por papel quando ativo; muted quando inativo */}
          {row.partner_role ? (
            <Badge
              variant={
                row.partner_status === "active"
                  ? PARTNER_VARIANT[row.partner_role]
                  : "muted"
              }
            >
              {PARTNER_LABEL[row.partner_role]}
              {row.partner_status && row.partner_status !== "active"
                ? ` · ${row.partner_status}`
                : ""}
            </Badge>
          ) : null}

          {/* Staff interno */}
          {row.staff_tier ? (
            <Badge variant={STAFF_VARIANT[row.staff_tier]}>
              {STAFF_LABEL[row.staff_tier]}
            </Badge>
          ) : null}

          {/* Orgs (chips) */}
          {shown.map((o) => (
            <span
              key={o.id}
              className="rounded-md bg-muted px-2 py-0.5 text-xs"
              title={o.name}
            >
              {o.name}
            </span>
          ))}
          {extra > 0 ? (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              +{extra}
            </span>
          ) : null}

          {!hasAnything ? (
            <span className="text-muted-foreground">(sem vínculo)</span>
          ) : null}
        </span>
      );
    },
  },
  {
    key: "created",
    header: "Criado em",
    width: "9rem",
    cell: (row) => (
      <span className="text-muted-foreground">
        {new Date(row.created_at).toLocaleDateString("pt-BR")}
      </span>
    ),
    sortAccessor: (row) => row.created_at,
  },
];

export function UserListTable({ rows }: { rows: UserRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      search={(r) => `${r.full_name ?? ""} ${r.email}`}
      searchPlaceholder="Filtrar nesta página…"
      initialSort={{ key: "created", dir: "desc" }}
      empty={
        <EmptyState
          icon={<Users />}
          title="Nenhum usuário encontrado"
          description="Convide um usuário para começar."
          action={
            <Link
              href="/users/new"
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              Convidar usuário
            </Link>
          }
        />
      }
    />
  );
}
