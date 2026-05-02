"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { revokeAffiliateInvitationAction } from "@/app/_actions/revoke-affiliate-invitation";

export function AffiliateRevokeButton({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-destructive text-destructive px-2.5 py-1 text-xs hover:bg-destructive/10"
      >
        Revogar
      </button>
      <ConfirmDialog
        open={open}
        title={`Revogar convite de ${email}`}
        description="O token deixa de ser aceitável. O afiliado não consegue mais aceitar este convite. Você pode emitir um novo se necessário."
        confirmLabel="Revogar"
        destructive
        requireReason
        onCancel={() => setOpen(false)}
        onConfirm={(reason) => {
          startTransition(async () => {
            const res = await revokeAffiliateInvitationAction({ invitationId, reason });
            if (!res.ok) {
              toast.error(res.message ?? `Falha (${res.error})`);
              return;
            }
            toast.success("Convite revogado");
            setOpen(false);
            router.refresh();
          });
        }}
      />
    </>
  );
}
