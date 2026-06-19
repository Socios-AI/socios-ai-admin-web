"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { attributeSubscriptionAction } from "@/app/_actions/attribute-subscription";

type PartnerOption = { id: string; label: string };

type Props = {
  subscriptionId: string;
  customer: string;
  currentLabel: string | null;
  partners: PartnerOption[];
};

export function AttributeSubscriptionDialog({
  subscriptionId,
  customer,
  currentLabel,
  partners,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function submit(targetPartnerId: string | null) {
    startTransition(async () => {
      const res = await attributeSubscriptionAction({ subscriptionId, partnerId: targetPartnerId });
      if (!res.ok) {
        toast.error(res.message ?? `Falha (${res.error})`);
        return;
      }
      toast.success(targetPartnerId ? "Venda atribuída ao parceiro" : "Atribuição removida");
      setOpen(false);
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
        {currentLabel ? "Reatribuir" : "Atribuir"}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg space-y-4">
            <h2 className="font-display font-semibold text-lg">Atribuir venda a parceiro</h2>
            <p className="text-sm text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{customer}</span>
              {currentLabel ? (
                <>
                  <br />
                  Atribuída hoje a: <span className="font-medium text-foreground">{currentLabel}</span>
                </>
              ) : null}
            </p>
            <div>
              <label htmlFor="partner-select" className="block text-sm font-medium mb-1">
                Parceiro
              </label>
              <select
                id="partner-select"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                disabled={partners.length === 0}
              >
                <option value="">Selecione um parceiro</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                A comissão das próximas faturas vai cascatear a partir do parceiro escolhido.
              </p>
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => submit(null)}
                disabled={isPending || !currentLabel}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-destructive hover:bg-muted disabled:opacity-40"
              >
                Remover atribuição
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => submit(partnerId)}
                  disabled={isPending || !partnerId}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : "Atribuir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
