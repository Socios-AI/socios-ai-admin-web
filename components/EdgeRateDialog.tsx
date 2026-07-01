"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setEdgeRateAction } from "@/app/_actions/set-edge-rate";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
  const keepHint = valid
    ? `Este ramo recebe ${(parsed * 100).toFixed(1)}% · você retém ${((1 - parsed) * 100).toFixed(1)}%`
    : "Informe um valor entre 0 e 1 (ex: 0.5 = 50%).";

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
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Editar taxa
      </Button>
      <Dialog
        open={open}
        onClose={isPending ? () => {} : close}
        title="Taxa de repasse"
        dismissible={!isPending}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Quanto do que chega a você desce para{" "}
            <span className="font-medium text-foreground">{childLabel}</span> (e a
            rede abaixo dele) nas assinaturas.
          </p>
          <Field
            label="Taxa (0 a 1 · ex: 0.5 = 50%)"
            htmlFor="rate-input"
            hint={keepHint}
          >
            <Input
              id="rate-input"
              type="number"
              min={0}
              max={1}
              step="0.01"
              value={rateStr}
              onChange={(e) => setRateStr(e.target.value)}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" loading={isPending} disabled={!valid}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
