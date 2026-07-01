"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

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
    <Dialog
      open={open}
      onClose={submitting ? () => {} : onCancel}
      title={title}
      description={description}
      dismissible={!submitting}
    >
      {requireReason && (
        <Field label="Motivo (mínimo 5 caracteres)" htmlFor="confirm-reason">
          <Textarea
            id="confirm-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
          />
        </Field>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? "destructive" : "primary"}
          onClick={handleConfirm}
          disabled={!reasonOk}
          loading={submitting}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
