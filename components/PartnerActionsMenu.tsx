"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./ConfirmDialog";
import { suspendPartnerAction } from "@/app/_actions/suspend-partner";
import { terminatePartnerAction } from "@/app/_actions/terminate-partner";
import type { PartnerStatus } from "@/lib/partners";

type Props = {
  partnerId: string;
  status: PartnerStatus;
};

type Mode = { kind: "none" } | { kind: "suspend" } | { kind: "terminate" };

export function PartnerActionsMenu({ partnerId, status }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => {
    setMode({ kind: "none" });
    setOpen(false);
  };

  function handle<T extends { ok: boolean; message?: string; error?: string }>(
    promise: Promise<T>,
    successMsg: string,
  ) {
    startTransition(async () => {
      const res = await promise;
      if (!res.ok) {
        toast.error(res.message ?? `Falha (${res.error ?? "erro"})`);
        return;
      }
      toast.success(successMsg);
      close();
      router.refresh();
    });
  }

  const canSuspend = status === "active";
  const canTerminate = status !== "terminated";

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        rightIcon={<ChevronDown className="h-4 w-4" aria-hidden="true" />}
      >
        Ações
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
          {canSuspend && (
            <button
              type="button"
              onClick={() => setMode({ kind: "suspend" })}
              className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-muted"
            >
              Suspender
            </button>
          )}
          {canTerminate && (
            <button
              type="button"
              onClick={() => setMode({ kind: "terminate" })}
              className="block w-full rounded px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
            >
              Encerrar
            </button>
          )}
          {!canSuspend && !canTerminate && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Nenhuma ação disponível.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={mode.kind === "suspend"}
        title="Suspender licenciado"
        description="O licenciado deixa de receber novas comissões enquanto suspenso. Pode ser reativado depois."
        confirmLabel="Suspender"
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(suspendPartnerAction({ partnerId, reason }), "Licenciado suspenso")
        }
      />

      <ConfirmDialog
        open={mode.kind === "terminate"}
        title="Encerrar licenciado"
        description="Encerramento é irreversível. O licenciado não poderá mais operar no programa."
        confirmLabel="Encerrar"
        destructive
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(terminatePartnerAction({ partnerId, reason }), "Licenciado encerrado")
        }
      />
    </div>
  );
}
