"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
      <tr key={s.id}>
        <td className="px-4 py-2">
          <div className="font-medium">{s.plan.name}</div>
          <div className="text-xs text-muted-foreground">
            {s.plan.app_slugs.length > 0
              ? s.plan.app_slugs.join(" · ")
              : "(sem apps vinculados)"}
          </div>
        </td>
        <td className="px-4 py-2 text-xs">
          <span
            className={
              s.status === "manual"
                ? "rounded-full bg-secondary text-secondary-foreground px-2 py-0.5"
                : s.status === "active"
                  ? "rounded-full bg-primary/10 text-primary px-2 py-0.5"
                  : "rounded-full bg-muted text-muted-foreground px-2 py-0.5"
            }
          >
            {s.status}
          </span>
        </td>
        <td className="px-4 py-2 text-sm">
          {formatPrice(s.plan.price_amount, s.plan.currency)} ({s.plan.billing_period})
        </td>
        <td className="px-4 py-2 text-sm text-muted-foreground">
          {formatDate(s.current_period_end)}
        </td>
        <td className="px-4 py-2">
          {s.via === "org" && orgHref ? (
            <Link
              href={orgHref}
              className="text-xs text-primary hover:underline"
            >
              Via org {s.via_org_id?.slice(0, 8)} · {s.via_app_slug}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">Direto</span>
          )}
        </td>
        <td className="px-4 py-2 text-right">
          {withCancel && s.via === "user" && (
            <button
              type="button"
              onClick={() => setMode({ kind: "cancel", subscriptionId: s.id })}
              className="rounded-lg border border-destructive/40 text-destructive px-3 py-1 text-xs hover:bg-destructive/10"
            >
              Cancelar
            </button>
          )}
          {withCancel && s.via === "org" && orgHref && (
            <Link
              href={orgHref}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancelar via organização
            </Link>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-lg">Subscriptions</h2>
        <button
          type="button"
          onClick={() => setMode({ kind: "assign" })}
          className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
        >
          Atribuir plano
        </button>
      </div>

      {subscriptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem subscriptions.</p>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Ativas
              </h3>
              <div className="rounded-xl border border-border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium">Plano</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Preço</th>
                      <th className="px-4 py-2 font-medium">Período até</th>
                      <th className="px-4 py-2 font-medium">Origem</th>
                      <th className="px-4 py-2 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>{activeSorted.map((s) => renderRow(s, true))}</tbody>
                </table>
              </div>
            </div>
          )}

          {ended.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Encerradas
              </h3>
              <div className="rounded-xl border border-border bg-card overflow-x-auto opacity-70">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-left">
                    <tr>
                      <th className="px-4 py-2 font-medium">Plano</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Preço</th>
                      <th className="px-4 py-2 font-medium">Período até</th>
                      <th className="px-4 py-2 font-medium">Origem</th>
                      <th className="px-4 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>{ended.map((s) => renderRow(s, false))}</tbody>
                </table>
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
