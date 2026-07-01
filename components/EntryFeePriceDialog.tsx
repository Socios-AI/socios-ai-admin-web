"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setEntryFeePriceAction } from "@/app/_actions/set-entry-fee-price";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type Props = {
  role: "licenciado" | "representante";
  roleLabel: string;
  currentAmount: number;
  currentCurrency: "usd" | "brl";
};

export function EntryFeePriceDialog({ role, roleLabel, currentAmount, currentCurrency }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amountStr, setAmountStr] = useState(String(currentAmount));
  const [currency, setCurrency] = useState<"usd" | "brl">(currentCurrency);
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setAmountStr(String(currentAmount));
    setCurrency(currentCurrency);
  };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const res = await setEntryFeePriceAction({ role, amount, currency });
      if (!res.ok) {
        toast.error(res.message ?? `Falha (${res.error})`);
        return;
      }
      toast.success("Preço atualizado (nova versão)");
      close();
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Novo preço
      </Button>
      <Dialog
        open={open}
        onClose={isPending ? () => {} : close}
        title={`Novo preço · ${roleLabel}`}
        description="Cria uma nova versão de preço. O histórico anterior é preservado (vendas passadas usam o valor da época)."
        dismissible={!isPending}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Field label="Valor" htmlFor="amt" className="flex-1">
              <Input
                id="amt"
                type="number"
                min={0}
                step="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                autoFocus
              />
            </Field>
            <Field label="Moeda" htmlFor="cur">
              <Select
                id="cur"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "usd" | "brl")}
              >
                <option value="usd">USD</option>
                <option value="brl">BRL</option>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
