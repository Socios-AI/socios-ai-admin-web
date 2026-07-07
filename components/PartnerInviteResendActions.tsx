"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendPartnerInviteAction } from "@/app/_actions/resend-partner-invite";

export function PartnerInviteResendActions({
  invitationId,
  inviteUrl,
  email,
}: {
  invitationId: string;
  inviteUrl: string;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente o link.");
    }
  }

  function resend() {
    startTransition(async () => {
      const r = await resendPartnerInviteAction({ invitationId });
      if (!r.ok) {
        toast.error(r.message ?? `Falha (${r.error})`);
        return;
      }
      toast.success(`Convite reenviado para ${email}`);
      router.refresh();
    });
  }

  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copyLink} disabled={pending}>
        Copiar link
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={resend} disabled={pending}>
        {pending ? "Reenviando..." : "Reenviar"}
      </Button>
    </div>
  );
}
