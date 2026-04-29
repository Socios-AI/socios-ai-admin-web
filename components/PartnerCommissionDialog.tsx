"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePartnerCommissionAction } from "@/app/_actions/update-partner-commission";

type Props = {
  partnerId: string;
  currentPct: number | null;
};

export function PartnerCommissionDialog({ partnerId, currentPct }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pctStr, setPctStr] = useState<string>(currentPct == null ? "" : String(currentPct));
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setPctStr(currentPct == null ? "" : String(currentPct));
    setReason("");
  };

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (reason.trim().length < 5) {
      toast.error("Motivo precisa ter no mínimo 5 caracteres.");
      return;
    }
    const trimmed = pctStr.trim();
    const pct = trimmed === "" ? null : Number(trimmed);
    if (pct !== null && (Number.isNaN(pct) || pct < 0 || pct > 1)) {
      toast.error("Comissão deve ser número entre 0 e 1, ou vazio para limpar.");
      return;
    }
    startTransition(async () => {
      const res = await updatePartnerCommissionAction({
        partnerId,
        customCommissionPct: pct,
        reason: reason.trim(),
      });
      if (!res.ok) {
        toast.error(res.message ?? `Falha (${res.error})`);
        return;
      }
      toast.success("Comissão atualizada");
      close();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted"
      >
        Editar comissão
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
            <h2 className="font-display font-semibold text-lg">Editar comissão custom</h2>
            <div>
              <label htmlFor="pct-input" className="block text-sm font-medium mb-1">
                Comissão (0 a 1, vazio para usar o padrão global)
              </label>
              <input
                id="pct-input"
                type="number"
                min={0}
                max={1}
                step="0.01"
                value={pctStr}
                onChange={(e) => setPctStr(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="reason-input" className="block text-sm font-medium mb-1">
                Motivo (mínimo 5 caracteres)
              </label>
              <textarea
                id="reason-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                required
              />
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
                disabled={isPending}
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
