"use client";

import Link from "next/link";
import type { AffiliateInvitationRow, AffiliateProfileRow } from "@/lib/affiliates";
import { AffiliateActivateButton } from "@/components/AffiliateActivateButton";
import { AffiliateRevokeButton } from "@/components/AffiliateRevokeButton";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export function AffiliatesTables({
  profiles,
  pending,
}: {
  profiles: AffiliateProfileRow[];
  pending: AffiliateInvitationRow[];
}) {
  const pendingColumns: Column<AffiliateInvitationRow>[] = [
    {
      key: "email",
      header: "Email",
      cell: (i) => <span className="font-mono text-xs">{i.email}</span>,
    },
    { key: "name", header: "Nome", cell: (i) => i.display_name },
    {
      key: "expires",
      header: "Expira",
      cell: (i) => (
        <span className="text-xs text-muted-foreground">
          {new Date(i.expires_at).toLocaleString("pt-BR")}
        </span>
      ),
      sortAccessor: (i) => i.expires_at,
    },
    {
      key: "action",
      header: "Ação",
      align: "right",
      cell: (i) => <AffiliateRevokeButton invitationId={i.id} email={i.email} />,
    },
  ];

  const profileColumns: Column<AffiliateProfileRow>[] = [
    {
      key: "name",
      header: "Nome",
      cell: (p) => (
        <Link href={`/affiliates/${p.user_id}`} className="text-primary hover:underline">
          {p.display_name}
        </Link>
      ),
      sortAccessor: (p) => p.display_name,
    },
    {
      key: "code",
      header: "Code",
      cell: (p) => <span className="font-mono text-xs">{p.affiliate_code}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) =>
        p.is_active ? (
          <Badge variant="success">Ativo</Badge>
        ) : (
          <Badge variant="warning">Pendente</Badge>
        ),
      filter: {
        label: "Status",
        options: [
          { label: "Ativo", value: "active" },
          { label: "Pendente", value: "pending" },
        ],
        accessor: (p) => (p.is_active ? "active" : "pending"),
      },
    },
    {
      key: "created",
      header: "Criado",
      cell: (p) => (
        <span className="text-xs text-muted-foreground">
          {new Date(p.created_at).toLocaleDateString("pt-BR")}
        </span>
      ),
      sortAccessor: (p) => p.created_at,
    },
    {
      key: "action",
      header: "Ação",
      align: "right",
      cell: (p) => (p.is_active ? null : <AffiliateActivateButton userId={p.user_id} />),
    },
  ];

  return (
    <div className="space-y-6">
      {pending.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Convites pendentes
          </h2>
          <DataTable
            columns={pendingColumns}
            data={pending}
            getRowId={(i) => i.id}
            initialSort={{ key: "expires", dir: "asc" }}
          />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Afiliados ({profiles.length})
        </h2>
        <DataTable
          columns={profileColumns}
          data={profiles}
          getRowId={(p) => p.user_id}
          search={(p) => `${p.display_name} ${p.affiliate_code}`}
          searchPlaceholder="Buscar nome ou code…"
          initialSort={{ key: "created", dir: "desc" }}
          empty={<EmptyState title="Nenhum afiliado cadastrado ainda." />}
        />
      </section>
    </div>
  );
}
