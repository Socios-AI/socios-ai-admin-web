"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePartnerCommissionAction } from "@/app/_actions/update-partner-commission";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Editar comissão
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Editar comissão custom"
        dismissible={!isPending}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Comissão (0 a 1, vazio para usar o padrão global)"
            htmlFor="pct-input"
          >
            <Input
              id="pct-input"
              type="number"
              min={0}
              max={1}
              step="0.01"
              value={pctStr}
              onChange={(e) => setPctStr(e.target.value)}
            />
          </Field>
          <Field label="Motivo (mínimo 5 caracteres)" htmlFor="reason-input">
            <Textarea
              id="reason-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </Field>
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
