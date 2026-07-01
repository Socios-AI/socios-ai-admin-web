"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { BillingPeriod } from "@/lib/data";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonClasses } from "@/components/ui/button";

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

  if (plans.length === 0) {
    return (
      <Dialog
        open={open}
        onClose={onCancel}
        title="Atribuir plano"
        description="Nenhum plano ativo disponível. Crie um plano antes de atribuir."
      >
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Link href="/plans/new" className={buttonClasses({ variant: "primary" })}>
            Criar plano
          </Link>
        </DialogFooter>
      </Dialog>
    );
  }

  const isCustom = selectedPlan?.billing_period === "custom";
  const isOneTime = selectedPlan?.billing_period === "one_time";

  return (
    <Dialog open={open} onClose={onCancel} title="Atribuir plano">
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
        className="space-y-4"
      >
        <Field label="Plano" htmlFor="ap-plan">
          <Select
            id="ap-plan"
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              const next = plans.find((p) => p.id === e.target.value);
              if (next) setPeriodEnd(defaultPeriodEnd(next.billing_period));
            }}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.billing_period})
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={
            <>
              Fim do período{" "}
              {isOneTime && (
                <span className="text-xs text-muted-foreground">
                  (deixe vazio para vitalício)
                </span>
              )}
            </>
          }
          htmlFor="ap-period-end"
        >
          <Input
            id="ap-period-end"
            type="date"
            value={periodEnd}
            required={isCustom}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </Field>

        <Field label="Observação" htmlFor="ap-notes">
          <Textarea
            id="ap-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">Atribuir</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
