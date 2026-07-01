"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markEntryFeePaidAction } from "@/app/_actions/mark-entry-fee-paid";

export function MarkEntryFeePaidButton({ partnerId }: { partnerId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await markEntryFeePaidAction({ partnerId });
          if (!r.ok) {
            toast.error(r.message ?? "Erro ao marcar taxa como paga.");
            return;
          }
          toast.success("Taxa de entrada marcada como paga.");
        })
      }
    >
      Marcar taxa de entrada paga
    </Button>
  );
}
