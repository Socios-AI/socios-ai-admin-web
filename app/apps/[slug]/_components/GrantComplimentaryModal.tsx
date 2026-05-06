"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { grantComplimentaryAction } from "@/app/_actions/case-predictor/grant-complimentary";

type Props = {
  onClose: () => void;
};

export function GrantComplimentaryModal({ onClose }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [leadId, setLeadId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const success = result?.ok === true;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  function handleClose() {
    if (busy) return;
    if (success) router.refresh();
    onClose();
  }

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
      router.refresh();
    } else {
      setResult({ ok: false, message: r.message });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4 relative"
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={busy}
          aria-label="Fechar"
          className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
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
            disabled={success}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gc-lead" className="text-sm font-medium">
            Lead ID <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <input
            id="gc-lead"
            type="text"
            disabled={success}
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono disabled:opacity-60"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="gc-reason" className="text-sm font-medium">Motivo</label>
          <input
            id="gc-reason"
            type="text"
            required
            minLength={3}
            disabled={success}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
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
            onClick={handleClose}
            disabled={busy}
            className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {success ? "Fechar" : "Cancelar"}
          </button>
          {!success && (
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Liberando..." : "Liberar"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
