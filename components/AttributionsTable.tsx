"use client";

import type { AttributableSubscription } from "@/lib/data";
import { AttributeSubscriptionDialog } from "@/components/AttributeSubscriptionDialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

type PartnerOption = { id: string; label: string };

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: "success",
  trialing: "warning",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Trial",
};

export function AttributionsTable({
  subs,
  partners,
}: {
  subs: AttributableSubscription[];
  partners: PartnerOption[];
}) {
  const columns: Column<AttributableSubscription>[] = [
    { key: "customer", header: "Cliente", cell: (s) => s.customer },
    {
      key: "app",
      header: "App",
      cell: (s) => <span className="text-muted-foreground">{s.appSlug ?? "—"}</span>,
    },
    {
      key: "plan",
      header: "Plano",
      cell: (s) => <span className="text-muted-foreground">{s.planName ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (s) => (
        <Badge variant={STATUS_VARIANT[s.status] ?? "muted"}>
          {STATUS_LABEL[s.status] ?? s.status}
        </Badge>
      ),
    },
    {
      key: "attributed",
      header: "Atribuída a",
      cell: (s) =>
        s.attributedLabel ? (
          <span className="text-foreground">{s.attributedLabel}</span>
        ) : (
          <span className="text-muted-foreground">não atribuída</span>
        ),
    },
    {
      key: "action",
      header: "Ação",
      align: "right",
      cell: (s) => (
        <AttributeSubscriptionDialog
          subscriptionId={s.id}
          customer={s.customer}
          currentLabel={s.attributedLabel}
          partners={partners}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={subs}
      getRowId={(s) => s.id}
      search={(s) => `${s.customer} ${s.appSlug ?? ""} ${s.planName ?? ""}`}
      searchPlaceholder="Buscar cliente, app ou plano…"
      empty={<EmptyState title="Nenhuma assinatura ativa ou em trial." />}
    />
  );
}
