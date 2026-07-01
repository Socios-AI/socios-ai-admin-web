"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import type { PartnerRow } from "@/lib/data";
import { PartnerStatusBadge } from "./PartnerStatusBadge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";

const ROLE_LABEL: Record<NonNullable<PartnerRow["role"]>, string> = {
  licenciado: "Licenciado",
  representante: "Representante",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};

const STATUS_LABEL: Record<PartnerRow["status"], string> = {
  pending_contract: "Aguardando contrato",
  pending_payment: "Aguardando pagamento",
  pending_kyc: "Aguardando KYC",
  active: "Ativo",
  suspended: "Suspenso",
  terminated: "Encerrado",
};

function fmtPct(pct: number | null): string {
  if (pct == null) return "padrão";
  return `${(pct * 100).toFixed(1)}%`;
}

function fmtDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("pt-BR");
}

function TierBadge({ tier }: { tier: PartnerRow["tier"] }) {
  return tier === "reseller" ? (
    <Badge variant="navy">Revendedor</Badge>
  ) : (
    <Badge variant="warning">Licenciado</Badge>
  );
}

type Profile = { email: string; full_name: string | null };

export function PartnerListTable({
  partners,
  profiles,
}: {
  partners: PartnerRow[];
  profiles: Map<string, Profile>;
}) {
  const profileOf = (p: PartnerRow): Profile | null =>
    p.user_id ? profiles.get(p.user_id) ?? null : null;

  const tierCounts = {
    licensee: partners.filter((p) => p.tier === "licensee").length,
    reseller: partners.filter((p) => p.tier === "reseller").length,
  };

  // Só oferece os status que existem nos dados, com contagem no rótulo (evita
  // opções vazias e colisão de texto com o badge de status).
  const statusOptions = (Object.keys(STATUS_LABEL) as PartnerRow["status"][])
    .map((s) => ({ status: s, count: partners.filter((p) => p.status === s).length }))
    .filter((o) => o.count > 0)
    .map((o) => ({ label: `${STATUS_LABEL[o.status]} (${o.count})`, value: o.status }));

  const columns: Column<PartnerRow>[] = [
    {
      key: "tier",
      header: "Tier",
      width: "7rem",
      cell: (p) => <TierBadge tier={p.tier} />,
      filter: {
        label: "Tier",
        options: [
          { label: `Licenciado (${tierCounts.licensee})`, value: "licensee" },
          { label: `Revendedor (${tierCounts.reseller})`, value: "reseller" },
        ],
        accessor: (p) => p.tier,
      },
    },
    {
      key: "role",
      header: "Papel",
      width: "8rem",
      cell: (p) =>
        p.role ? (
          <Badge variant="muted">{ROLE_LABEL[p.role]}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "10.5rem",
      cell: (p) => <PartnerStatusBadge status={p.status} />,
      filter: {
        label: "Status",
        options: statusOptions,
        accessor: (p) => p.status,
      },
    },
    {
      key: "name",
      header: "Nome",
      cell: (p) => {
        if (!p.user_id)
          return <span className="italic text-muted-foreground">user removido</span>;
        const profile = profileOf(p);
        return profile?.full_name ? (
          <span className="font-medium">{profile.full_name}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
      sortAccessor: (p) => profileOf(p)?.full_name?.toLowerCase() ?? "",
    },
    {
      key: "email",
      header: "Email",
      cell: (p) => (
        <span className="text-muted-foreground">
          {profileOf(p)?.email ?? "-"}
        </span>
      ),
    },
    {
      key: "commission",
      header: "Comissão",
      align: "right",
      width: "7rem",
      className: "tabular-nums",
      cell: (p) => fmtPct(p.custom_commission_pct),
    },
    {
      key: "activated",
      header: "Ativado em",
      width: "9rem",
      cell: (p) => fmtDate(p.activated_at),
      sortAccessor: (p) => p.activated_at ?? "",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "6rem",
      cell: (p) => (
        <Link href={`/partners/${p.id}`} className="text-primary hover:underline">
          Detalhes
        </Link>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={partners}
      getRowId={(p) => p.id}
      search={(p) => {
        const profile = profileOf(p);
        return `${profile?.full_name ?? ""} ${profile?.email ?? ""}`;
      }}
      searchPlaceholder="Buscar por nome ou email…"
      initialSort={{ key: "activated", dir: "desc" }}
      pageSize={25}
      empty={
        <EmptyState
          icon={<Users />}
          title="Nenhum parceiro cadastrado"
          description="Convide um parceiro para começar a montar a rede."
          action={
            <Link
              href="/partners/invite"
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              Convidar parceiro
            </Link>
          }
        />
      }
    />
  );
}
