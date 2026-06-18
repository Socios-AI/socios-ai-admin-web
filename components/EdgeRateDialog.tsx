"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setEdgeRateAction } from "@/app/_actions/set-edge-rate";

type Props = {
  childPartnerId: string;
  childLabel: string;
  currentRate: number | null;
};

export function EdgeRateDialog({ childPartnerId, childLabel, currentRate }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rateStr, setRateStr] = useState<string>(currentRate == null ? "" : String(currentRate));
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setRateStr(currentRate == null ? "" : String(currentRate));
  };

  const parsed = rateStr.trim() === "" ? null : Number(rateStr);
  const valid = parsed !== null && !Number.isNaN(parsed) && parsed >= 0 && parsed <= 1;
  const keepHint = valid ? `Este ramo recebe ${(parsed * 100).toFixed(1)}% · você retém ${((1 - parsed) * 100).toFixed(1)}%` : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) {
      toast.error("Taxa deve ser número entre 0 e 1 (ex: 0.5 = 50%).");
      return;
    }
    startTransition(async () => {
      const res = await setEdgeRateAction({
        childPartnerId,
        rate: parsed,
        revenueKind: "subscription",
      });
      if (!res.ok) {
        toast.error(res.message ?? `Falha (${res.error})`);
        return;
      }
      toast.success("Taxa atualizada");
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
        Editar taxa
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <form
            onSubmit={onSubmit}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg space-y-4"
          >
            <h2 className="font-display font-semibold text-lg">Taxa de repasse</h2>
            <p className="text-sm text-muted-foreground">
              Quanto do que chega a você desce para <span className="font-medium text-foreground">{childLabel}</span> (e a rede abaixo dele) nas assinaturas.
            </p>
            <div>
              <label htmlFor="rate-input" className="block text-sm font-medium mb-1">
                Taxa (0 a 1 · ex: 0.5 = 50%)
              </label>
              <input
                id="rate-input"
                type="number"
                min={0}
                max={1}
                step="0.01"
                value={rateStr}
                onChange={(e) => setRateStr(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
                autoFocus
              />
              {keepHint ? (
                <p className="mt-1.5 text-xs text-muted-foreground">{keepHint}</p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className="rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || !valid}
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
