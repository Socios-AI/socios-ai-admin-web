"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ConfirmDialog } from "./ConfirmDialog";
import { AssignPlanDialog } from "./AssignPlanDialog";
import { assignManualSubscriptionAction } from "@/app/_actions/assign-manual-subscription";
import { cancelSubscriptionAction } from "@/app/_actions/cancel-subscription";
import type { UserSubscription, BillingPeriod, PlanCurrency } from "@/lib/data";

type AvailablePlan = {
  id: string;
  slug: string;
  name: string;
  billing_period: BillingPeriod;
  price_amount: number;
  currency: PlanCurrency;
  is_active: boolean;
};

type Props = {
  userId: string;
  subscriptions: UserSubscription[];
  availablePlans: AvailablePlan[];
};

type Mode =
  | { kind: "none" }
  | { kind: "assign" }
  | { kind: "cancel"; subscriptionId: string };

const TERMINAL = new Set(["canceled", "expired"]);

function formatPrice(amount: number, currency: string): string {
  const major = amount / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(major);
}

function formatDate(iso: string | null): string {
  if (!iso) return "vitalício";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function statusVariant(status: string): BadgeVariant {
  if (status === "active") return "success";
  if (status === "manual") return "navy";
  if (TERMINAL.has(status)) return "muted";
  return "default";
}

export function PlansTab({ userId, subscriptions, availablePlans }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [, startTransition] = useTransition();

  const close = () => setMode({ kind: "none" });

  const active = subscriptions.filter((s) => !TERMINAL.has(s.status));
  const ended = subscriptions.filter((s) => TERMINAL.has(s.status));

  const activeSorted = [...active].sort((a, b) => {
    if (a.via !== b.via) return a.via === "user" ? -1 : 1;
    return a.started_at < b.started_at ? 1 : -1;
  });

  const eligiblePlans = availablePlans.filter((p) => p.is_active);

  function handleAssign(input: {
    planId: string;
    startedAt?: string;
    currentPeriodEnd: string | null;
    notes?: string;
  }) {
    startTransition(async () => {
      const res = await assignManualSubscriptionAction({ userId, ...input });
      if (!res.ok) {
        toast.error(res.message ?? `Falha (${res.error})`);
        return;
      }
      close();
      router.refresh();
      toast.success("Plano atribuído");
    });
  }

  function handleCancel(subscriptionId: string, reason: string) {
    startTransition(async () => {
      const res = await cancelSubscriptionAction({ subscriptionId, reason });
      if (!res.ok) {
        toast.error(res.message ?? `Falha (${res.error})`);
        return;
      }
      close();
      router.refresh();
      toast.success("Subscription cancelada");
    });
  }

  function renderRow(s: UserSubscription, withCancel: boolean) {
    const orgHref =
      s.via === "org" && s.via_org_id
        ? `/orgs/${s.via_org_id}?app=${encodeURIComponent(s.via_app_slug ?? "")}`
        : null;

    return (
      <TR key={s.id}>
        <TD>
          <div className="font-medium">{s.plan.name}</div>
          <div className="text-xs text-muted-foreground">
            {s.plan.app_slugs.length > 0
              ? s.plan.app_slugs.join(" · ")
              : "(sem apps vinculados)"}
          </div>
        </TD>
        <TD>
          <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
        </TD>
        <TD className="text-right tabular-nums">
          {formatPrice(s.plan.price_amount, s.plan.currency)} ({s.plan.billing_period})
        </TD>
        <TD className="text-muted-foreground">
          {formatDate(s.current_period_end)}
        </TD>
        <TD>
          {s.via === "org" && orgHref ? (
            <Link href={orgHref} className="text-xs text-primary hover:underline">
              Via org {s.via_org_id?.slice(0, 8)} · {s.via_app_slug}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">Direto</span>
          )}
        </TD>
        <TD className="text-right">
          {withCancel && s.via === "user" && (
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setMode({ kind: "cancel", subscriptionId: s.id })}
            >
              Cancelar
            </Button>
          )}
          {withCancel && s.via === "org" && orgHref && (
            <Link
              href={orgHref}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancelar via organização
            </Link>
          )}
        </TD>
      </TR>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-lg">Subscriptions</h2>
        <Button size="sm" onClick={() => setMode({ kind: "assign" })}>
          Atribuir plano
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">Sem subscriptions.</Card>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Ativas
              </h3>
              <Table>
                <THead>
                  <TR>
                    <TH>Plano</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Preço</TH>
                    <TH>Período até</TH>
                    <TH>Origem</TH>
                    <TH className="text-right">Ações</TH>
                  </TR>
                </THead>
                <TBody>{activeSorted.map((s) => renderRow(s, true))}</TBody>
              </Table>
            </div>
          )}

          {ended.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Encerradas
              </h3>
              <div className="opacity-70">
                <Table>
                  <THead>
                    <TR>
                      <TH>Plano</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Preço</TH>
                      <TH>Período até</TH>
                      <TH>Origem</TH>
                      <TH />
                    </TR>
                  </THead>
                  <TBody>{ended.map((s) => renderRow(s, false))}</TBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      <AssignPlanDialog
        open={mode.kind === "assign"}
        plans={eligiblePlans}
        onCancel={close}
        onSubmit={handleAssign}
      />

      {mode.kind === "cancel" && (
        <ConfirmDialog
          open
          title="Cancelar subscription"
          description="O cancelamento é imediato. O período registrado fica como histórico."
          confirmLabel="Cancelar subscription"
          destructive
          requireReason
          onCancel={close}
          onConfirm={(reason) => handleCancel(mode.subscriptionId, reason)}
        />
      )}
    </div>
  );
}
