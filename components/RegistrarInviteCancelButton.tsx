"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button } from "@/components/ui/button";
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="border-destructive text-destructive hover:bg-destructive/10"
      >
        Cancelar
      </Button>
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
