"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { BillingPeriod } from "@/lib/data";

type PlanOption = {
  id: string;
  slug: string;
  name: string;
  billing_period: BillingPeriod;
  price_amount: number;
  currency: string;
};

type Props = {
  open: boolean;
  plans: PlanOption[];
  onSubmit: (input: {
    planId: string;
    startedAt?: string;
    currentPeriodEnd: string | null;
    notes?: string;
  }) => void;
  onCancel: () => void;
};

function defaultPeriodEnd(billing: BillingPeriod): string {
  const now = new Date();
  const target = new Date(now);
  if (billing === "monthly") {
    target.setMonth(target.getMonth() + 1);
    return target.toISOString().slice(0, 10);
  }
  if (billing === "yearly") {
    target.setFullYear(target.getFullYear() + 1);
    return target.toISOString().slice(0, 10);
  }
  return "";
}

export function AssignOrgPlanDialog({ open, plans, onSubmit, onCancel }: Props) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId) ?? plans[0],
    [planId, plans],
  );
  const [periodEnd, setPeriodEnd] = useState(
    selectedPlan ? defaultPeriodEnd(selectedPlan.billing_period) : "",
  );
  const [notes, setNotes] = useState("");

  if (!open) return null;

  if (plans.length === 0) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      >
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg">Atribuir plano</h2>
          <p className="text-sm text-muted-foreground">
            Nenhum plano ativo disponível. Crie um plano antes de atribuir.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
            >
              Cancelar
            </button>
            <Link
              href="/plans/new"
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
            >
              Criar plano
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      planId,
      currentPeriodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4"
      >
        <h2 className="font-display font-semibold text-lg">Atribuir plano à organização</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="aop-plan">
            Plano
          </label>
          <select
            id="aop-plan"
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              const next = plans.find((p) => p.id === e.target.value);
              if (next) setPeriodEnd(defaultPeriodEnd(next.billing_period));
            }}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.billing_period})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="aop-period-end">
            Fim do período (opcional)
          </label>
          <input
            id="aop-period-end"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">Vazio = vitalício.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="aop-notes">
            Observações (opcional)
          </label>
          <textarea
            id="aop-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Usuários da organização verão o plano novo no próximo refresh do token (~1h) ou
          após logout/login. Para forçar agora, use force logout em /users/[id].
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Atribuir
          </button>
        </div>
      </form>
    </div>
  );
}
