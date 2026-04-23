"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  requireReason?: boolean;
  destructive?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  requireReason = false,
  destructive = false,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason("");
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const reasonOk = !requireReason || reason.trim().length >= 5;

  async function handleConfirm() {
    if (!reasonOk || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg space-y-4">
        <div className="space-y-1">
          <h2 id="confirm-dialog-title" className="font-display font-semibold text-lg">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {requireReason && (
          <div className="space-y-1.5">
            <label htmlFor="confirm-reason" className="text-sm font-medium">
              Motivo (mínimo 5 caracteres)
            </label>
            <textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-muted transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!reasonOk || submitting}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
              destructive
                ? "bg-destructive text-destructive-foreground hover:opacity-90"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
