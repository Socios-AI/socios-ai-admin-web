"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { revokeReferralAction } from "@/app/_actions/revoke-referral";

export function RevokeReferralDialog({ referralId }: { referralId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="text-destructive hover:underline ml-2"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Revogar
      </button>
      <ConfirmDialog
        open={open}
        title="Revogar indicação"
        description={
          error
            ? `Erro: ${error}`
            : "Esta ação remove a atribuição. Não pode ser desfeita."
        }
        confirmLabel="Revogar"
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          startTransition(async () => {
            const out = await revokeReferralAction({ referralId });
            if (!out.ok) {
              setError(out.message ?? out.error);
            } else {
              setOpen(false);
              router.refresh();
            }
          });
        }}
      />
    </>
  );
}
