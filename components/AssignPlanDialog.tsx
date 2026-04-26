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
  return ""; // one_time + custom => empty
}

export function AssignPlanDialog({ open, plans, onSubmit, onCancel }: Props) {
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

  const isCustom = selectedPlan?.billing_period === "custom";
  const isOneTime = selectedPlan?.billing_period === "one_time";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const periodEndIso =
            periodEnd.trim() === "" ? null : new Date(periodEnd).toISOString();
          onSubmit({
            planId,
            currentPeriodEnd: periodEndIso,
            notes: notes.trim() || undefined,
          });
        }}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4"
      >
        <h2 className="font-display font-semibold text-lg">Atribuir plano</h2>

        <div className="space-y-1.5">
          <label htmlFor="ap-plan" className="text-sm font-medium">Plano</label>
          <select
            id="ap-plan"
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
          <label htmlFor="ap-period-end" className="text-sm font-medium">
            Fim do período {isOneTime && <span className="text-xs text-muted-foreground">(deixe vazio para vitalício)</span>}
          </label>
          <input
            id="ap-period-end"
            type="date"
            value={periodEnd}
            required={isCustom}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ap-notes" className="text-sm font-medium">Observação</label>
          <textarea
            id="ap-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

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
