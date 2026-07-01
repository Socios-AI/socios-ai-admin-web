"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transferReferralAction } from "@/app/_actions/transfer-referral";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function TransferReferralDialog({
  referralId,
  fromPartnerId,
}: {
  referralId: string;
  fromPartnerId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toPartnerId, setToPartnerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const close = () => {
    setOpen(false);
    setToPartnerId("");
    setError(null);
  };

  return (
    <>
      <button type="button" className="mr-2 hover:underline" onClick={() => setOpen(true)}>
        Transferir
      </button>
      <Dialog
        open={open}
        onClose={close}
        title="Transferir indicação"
        description={
          <>
            Origem: <code className="font-mono text-xs">{fromPartnerId.slice(0, 8)}...</code>
          </>
        }
        dismissible={!isPending}
      >
        <Field label="UUID do licenciado de destino" htmlFor="transfer-to-input">
          <Input
            id="transfer-to-input"
            type="text"
            value={toPartnerId}
            onChange={(e) => setToPartnerId(e.target.value)}
            placeholder="uuid-uuid-uuid-uuid-uuid"
            className="font-mono text-xs"
            disabled={isPending}
          />
        </Field>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending || !toPartnerId.trim()}
            loading={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const out = await transferReferralAction({
                  referralId,
                  toPartnerId: toPartnerId.trim(),
                });
                if (!out.ok) {
                  setError(out.message ?? out.error);
                } else {
                  close();
                  router.refresh();
                }
              });
            }}
          >
            Transferir
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
