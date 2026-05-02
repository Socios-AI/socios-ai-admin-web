"use client";

import { useState, useTransition } from "react";
import { activateAffiliateAction } from "@/app/_actions/activate-affiliate";

export function AffiliateActivateButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onClick() {
    setMsg(null);
    startTransition(async () => {
      const res = await activateAffiliateAction({ userId });
      if (!res.ok) {
        setMsg(`Erro: ${res.message ?? res.error}`);
        return;
      }
      setMsg(
        res.recoveryEmailSent
          ? "Ativado · email de set-password enviado"
          : "Ativado · falha ao enviar email (reenvie manualmente)"
      );
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={pending}
        className="rounded-md border border-border bg-secondary px-2.5 py-1 text-xs hover:bg-secondary/80 disabled:opacity-50"
      >
        {pending ? "Ativando..." : "Ativar conta"}
      </button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
