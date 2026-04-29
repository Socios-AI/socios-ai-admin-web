"use client";

import { useState, useTransition } from "react";
import { createPartnerInvitationAction } from "@/app/_actions/create-partner-invitation";

const ERROR_LABEL: Record<string, string> = {
  FORBIDDEN:             "Sem permissão.",
  VALIDATION:            "Dados inválidos.",
  DROPBOX_SIGN_ERROR:    "Falha ao gerar contrato.",
  STRIPE_CONNECT_ERROR:  "Falha ao gerar link de pagamento.",
  API_ERROR:             "Erro na API.",
};

export function PartnerInvitationForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ url: string; mocked: boolean } | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get("email") ?? "").trim(),
      fullName: String(fd.get("fullName") ?? "").trim(),
      licenseAmountUsd: Number(fd.get("licenseAmountUsd")),
      installments: Number(fd.get("installments") ?? 1),
      expiresInDays: Number(fd.get("expiresInDays") ?? 30),
      customCommissionPct: fd.get("customCommissionPct")
        ? Number(fd.get("customCommissionPct"))
        : undefined,
    };
    startTransition(async () => {
      const r = await createPartnerInvitationAction(payload);
      if (r.ok) {
        setSuccess({ url: r.invite_url, mocked: r.mocked_dropbox_sign || r.mocked_stripe_connect });
      } else {
        setError(r.message ?? ERROR_LABEL[r.error] ?? "Erro desconhecido.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 max-w-xl">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
        <input id="email" name="email" type="email" required className="w-full rounded-lg border border-input bg-background px-3 py-2" />
      </div>
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium mb-1">Nome completo</label>
        <input id="fullName" name="fullName" type="text" required minLength={2} className="w-full rounded-lg border border-input bg-background px-3 py-2" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="licenseAmountUsd" className="block text-sm font-medium mb-1">Valor da licença (USD)</label>
          <input id="licenseAmountUsd" name="licenseAmountUsd" type="number" required min={1} step="0.01" defaultValue={10000} className="w-full rounded-lg border border-input bg-background px-3 py-2" />
        </div>
        <div>
          <label htmlFor="installments" className="block text-sm font-medium mb-1">Parcelas</label>
          <select id="installments" name="installments" defaultValue={1} className="w-full rounded-lg border border-input bg-background px-3 py-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}x</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="customCommissionPct" className="block text-sm font-medium mb-1">
            Comissão custom (0-1, opcional)
          </label>
          <input id="customCommissionPct" name="customCommissionPct" type="number" min={0} max={1} step="0.01" placeholder="ex: 0.5" className="w-full rounded-lg border border-input bg-background px-3 py-2" />
        </div>
        <div>
          <label htmlFor="expiresInDays" className="block text-sm font-medium mb-1">Validade (dias)</label>
          <input id="expiresInDays" name="expiresInDays" type="number" min={1} max={60} defaultValue={30} className="w-full rounded-lg border border-input bg-background px-3 py-2" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Convite criado{success.mocked ? " (modo mock)" : ""}.
          <br />
          URL: <code className="break-all">{success.url}</code>
        </div>
      )}
      <button type="submit" disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {pending ? "Enviando..." : "Enviar convite"}
      </button>
    </form>
  );
}
