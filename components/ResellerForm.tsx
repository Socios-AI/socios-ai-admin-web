"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createResellerAction } from "@/app/_actions/create-reseller";

export function ResellerForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ partnerId: string; recoveryEmailSent: boolean } | null>(
    null,
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get("email") ?? "").trim(),
      fullName: String(fd.get("fullName") ?? "").trim(),
      customCommissionPct: fd.get("customCommissionPct")
        ? Number(fd.get("customCommissionPct"))
        : undefined,
    };
    startTransition(async () => {
      const res = await createResellerAction(payload);
      if (!res.ok) {
        setError(res.message ?? res.error);
        return;
      }
      setSuccess({ partnerId: res.partnerId, recoveryEmailSent: res.recoveryEmailSent });
    });
  }

  if (success) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 p-4 text-sm">
          <p className="font-medium">Revendedor criado.</p>
          <p className="mt-1 text-muted-foreground">
            {success.recoveryEmailSent
              ? "Email de set-password enviado."
              : "Falha ao enviar email de set-password (reenvie manualmente)."}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/partners/${success.partnerId}`}
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm hover:bg-secondary/80"
          >
            Ver revendedor
          </Link>
          <Link
            href="/partners"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium mb-1">Nome completo</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="customCommissionPct" className="block text-sm font-medium mb-1">
          Comissão custom (opcional, 0 a 1)
        </label>
        <input
          id="customCommissionPct"
          name="customCommissionPct"
          type="number"
          step="0.0001"
          min="0"
          max="1"
          placeholder="ex: 0.10 (10%)"
          className="w-full rounded-lg border border-input bg-background px-3 py-2"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Em branco usa o valor fixo padrão (commission_config). Comissão real
          de revendedor é valor fixo, não percentual; este campo só sobrescreve
          se houver acordo específico.
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 p-3 text-sm">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Criando..." : "Criar revendedor"}
      </button>
    </form>
  );
}
