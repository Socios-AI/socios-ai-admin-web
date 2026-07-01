"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { activateAffiliateAction } from "@/app/_actions/activate-affiliate";

export function AffiliateActivateButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const res = await activateAffiliateAction({ userId });
      if (!res.ok) {
        toast.error(`Erro: ${res.message ?? res.error}`);
        return;
      }
      toast.success(
        res.recoveryEmailSent
          ? "Ativado · email de set-password enviado"
          : "Ativado · falha ao enviar email (reenvie manualmente)"
      );
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={onClick} loading={pending}>
      {pending ? "Ativando..." : "Ativar conta"}
    </Button>
  );
}
