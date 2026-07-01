"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { attributeSubscriptionAction } from "@/app/_actions/attribute-subscription";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

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
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        {currentLabel ? "Reatribuir" : "Atribuir"}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Atribuir venda a parceiro"
        dismissible={!isPending}
      >
        <p className="text-sm text-muted-foreground">
          Cliente: <span className="font-medium text-foreground">{customer}</span>
          {currentLabel ? (
            <>
              <br />
              Atribuída hoje a: <span className="font-medium text-foreground">{currentLabel}</span>
            </>
          ) : null}
        </p>
        <Field
          label="Parceiro"
          htmlFor="partner-select"
          hint="A comissão das próximas faturas vai cascatear a partir do parceiro escolhido."
        >
          <Select
            id="partner-select"
            value={partnerId}
            onChange={(e) => setPartnerId(e.target.value)}
            disabled={partners.length === 0}
          >
            <option value="">Selecione um parceiro</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </Field>
        <DialogFooter className="justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => submit(null)}
            disabled={isPending || !currentLabel}
            className="text-destructive"
          >
            Remover atribuição
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => submit(partnerId)}
              disabled={isPending || !partnerId}
              loading={isPending}
            >
              Atribuir
            </Button>
          </div>
        </DialogFooter>
      </Dialog>
    </>
  );
}
