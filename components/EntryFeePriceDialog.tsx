"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setEntryFeePriceAction } from "@/app/_actions/set-entry-fee-price";

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-input bg-background px-2.5 py-1 text-xs hover:bg-muted"
      >
        Novo preço
      </button>
      {open && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg space-y-4">
            <h2 className="font-display font-semibold text-lg">Novo preço · {roleLabel}</h2>
            <p className="text-sm text-muted-foreground">
              Cria uma nova versão de preço. O histórico anterior é preservado (vendas passadas usam o valor da época).
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="amt" className="block text-sm font-medium mb-1">Valor</label>
                <input
                  id="amt"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="cur" className="block text-sm font-medium mb-1">Moeda</label>
                <select
                  id="cur"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "usd" | "brl")}
                  className="rounded-lg border border-input bg-background px-3 py-2"
                >
                  <option value="usd">USD</option>
                  <option value="brl">BRL</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} disabled={isPending} className="rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={isPending} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
