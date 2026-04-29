"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { transferReferralAction } from "@/app/_actions/transfer-referral";

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
      <button
        type="button"
        className="hover:underline mr-2"
        onClick={() => setOpen(true)}
      >
        Transferir
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-[28rem] shadow-lg">
            <h3 className="font-semibold text-lg mb-2">Transferir indicação</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Origem: <code className="font-mono text-xs">{fromPartnerId.slice(0, 8)}...</code>
            </p>
            <label className="block text-sm mb-1">
              UUID do licenciado de destino
            </label>
            <input
              type="text"
              value={toPartnerId}
              onChange={(e) => setToPartnerId(e.target.value)}
              placeholder="uuid-uuid-uuid-uuid-uuid"
              className="w-full border rounded px-2 py-1 mb-3 font-mono text-xs"
              disabled={isPending}
            />
            {error && (
              <p className="text-sm text-destructive mb-3">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={isPending}
                className="px-3 py-1.5 rounded border"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || !toPartnerId.trim()}
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
                className="px-3 py-1.5 rounded bg-primary text-primary-foreground inline-flex items-center gap-2"
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Transferir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
