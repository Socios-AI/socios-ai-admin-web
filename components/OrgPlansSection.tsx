"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { AssignOrgPlanDialog } from "./AssignOrgPlanDialog";
import { assignManualSubscriptionAction } from "@/app/_actions/assign-manual-subscription";
import { cancelSubscriptionAction } from "@/app/_actions/cancel-subscription";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { OrgSubscription, BillingPeriod, PlanCurrency } from "@/lib/data";

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
  orgId: string;
  appSlug: string;
  subscriptions: OrgSubscription[];
  availablePlans: AvailablePlan[];
};

type Mode = { kind: "none" } | { kind: "assign" } | { kind: "cancel"; subscriptionId: string };

const TERMINAL = new Set(["canceled", "expired"]);

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(iso: string | null): string {
  if (!iso) return "vitalício";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function statusVariant(status: string): BadgeVariant {
  if (status === "active") return "success";
  if (status === "manual") return "purple";
  return "muted";
}

export function OrgPlansSection({ orgId, appSlug, subscriptions, availablePlans }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [, startTransition] = useTransition();

  const close = () => setMode({ kind: "none" });

  const active = subscriptions.filter((s) => !TERMINAL.has(s.status));
  const ended = subscriptions.filter((s) => TERMINAL.has(s.status));
  const eligiblePlans = availablePlans.filter((p) => p.is_active);

  function handleAssign(input: {
    planId: string;
    startedAt?: string;
    currentPeriodEnd: string | null;
    notes?: string;
  }) {
    startTransition(async () => {
      const res = await assignManualSubscriptionAction({ orgId, appSlug, ...input });
      if (!res.ok) {
        toast.error(res.message ?? `Falha (${res.error})`);
        return;
      }
      close();
      router.refresh();
      toast.success("Plano atribuído à organização");
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
      toast.success("Plano cancelado");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={() => setMode({ kind: "assign" })}>
          Atribuir plano
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum plano ativo para esta organização.</p>
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
                    <TH className="text-right">Ações</TH>
                  </TR>
                </THead>
                <TBody>
                  {active.map((s) => (
                    <TR key={s.id}>
                      <TD>
                        <div className="font-medium">{s.plan.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.plan.apps.length > 0
                            ? s.plan.apps.join(" · ")
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
                      <TD className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMode({ kind: "cancel", subscriptionId: s.id })}
                          className="border-destructive/40 text-destructive hover:bg-destructive/10"
                        >
                          Cancelar
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
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
                      <TH />
                    </TR>
                  </THead>
                  <TBody>
                    {ended.map((s) => (
                      <TR key={s.id}>
                        <TD>
                          <div className="font-medium">{s.plan.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.plan.apps.length > 0
                              ? s.plan.apps.join(" · ")
                              : "(sem apps vinculados)"}
                          </div>
                        </TD>
                        <TD>
                          <Badge variant="muted">{s.status}</Badge>
                        </TD>
                        <TD className="text-right tabular-nums">
                          {formatPrice(s.plan.price_amount, s.plan.currency)} ({s.plan.billing_period})
                        </TD>
                        <TD className="text-muted-foreground">
                          {formatDate(s.current_period_end)}
                        </TD>
                        <TD />
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}

      <AssignOrgPlanDialog
        open={mode.kind === "assign"}
        plans={eligiblePlans}
        onCancel={close}
        onSubmit={handleAssign}
      />

      {mode.kind === "cancel" && (
        <ConfirmDialog
          open
          title="Cancelar plano"
          description="O cancelamento é imediato. O período registrado fica como histórico."
          confirmLabel="Cancelar plano"
          destructive
          requireReason
          onCancel={close}
          onConfirm={(reason) => handleCancel(mode.subscriptionId, reason)}
        />
      )}
    </div>
  );
}
