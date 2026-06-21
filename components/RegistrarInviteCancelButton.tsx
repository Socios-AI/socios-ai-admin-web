"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { cancelPartnerInvitationAction } from "@/app/_actions/cancel-partner-invitation";

export function RegistrarInviteCancelButton({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="rounded-md border border-destructive px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        Cancelar
      </button>
      <ConfirmDialog
        open={open}
        title={`Cancelar convite de ${email}`}
        description="O convite será revogado e o link de onboarding deixará de funcionar. Informe o motivo (mín. 5 caracteres)."
        confirmLabel="Cancelar convite"
        destructive
        requireReason
        onCancel={() => setOpen(false)}
        onConfirm={(reason) =>
          startTransition(async () => {
            const r = await cancelPartnerInvitationAction({ invitationId, reason });
            if (!r.ok) {
              toast.error(r.message ?? `Falha (${r.error})`);
              return;
            }
            toast.success("Convite cancelado");
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
