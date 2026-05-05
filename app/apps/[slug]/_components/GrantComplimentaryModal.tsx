"use client";

import { useState } from "react";
import { grantComplimentaryAction } from "@/app/_actions/case-predictor/grant-complimentary";

type Props = {
  onClose: () => void;
};

export function GrantComplimentaryModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [leadId, setLeadId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const r = await grantComplimentaryAction({
      email,
      leadId: leadId.trim() || undefined,
      reason,
    });
    setBusy(false);
    if (r.ok) {
      setResult({ ok: true, message: `Order ${r.orderId} criada` });
    } else {
      setResult({ ok: false, message: r.message });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4"
      >
        <h2 className="font-display font-semibold text-lg">Grant complimentary order</h2>
        <p className="text-xs text-muted-foreground">
          Libera análise sem cobrança. Usa-se para casos especiais (cortesia, replacement, beta tester).
        </p>

        <div className="space-y-1.5">
          <label htmlFor="gc-email" className="text-sm font-medium">Email do usuário</label>
          <input
            id="gc-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gc-lead" className="text-sm font-medium">
            Lead ID <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <input
            id="gc-lead"
            type="text"
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gc-reason" className="text-sm font-medium">Motivo</label>
          <input
            id="gc-reason"
            type="text"
            required
            minLength={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {result && (
          <p className={result.ok ? "text-sm text-emerald-600" : "text-sm text-destructive"}>
            {result.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Liberando..." : "Liberar"}
          </button>
        </div>
      </form>
    </div>
  );
}
