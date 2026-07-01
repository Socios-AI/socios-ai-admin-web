"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonClasses } from "@/components/ui/button";
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

  if (plans.length === 0) {
    return (
      <Dialog open={open} onClose={onCancel} title="Atribuir plano" size="md">
        <p className="text-sm text-muted-foreground">
          Nenhum plano ativo disponível. Crie um plano antes de atribuir.
        </p>
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      planId,
      currentPeriodEnd: periodEnd ? new Date(periodEnd).toISOString() : null,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Atribuir plano à organização"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Plano" htmlFor="aop-plan">
          <Select
            id="aop-plan"
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
          label="Fim do período (opcional)"
          htmlFor="aop-period-end"
          hint="Vazio = vitalício."
        >
          <Input
            id="aop-period-end"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
          />
        </Field>

        <Field label="Observações (opcional)" htmlFor="aop-notes">
          <Textarea
            id="aop-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </Field>

        <p className="text-xs text-muted-foreground">
          Usuários da organização verão o plano novo no próximo refresh do token (~1h) ou
          após logout/login. Para forçar agora, use force logout em /users/[id].
        </p>

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
