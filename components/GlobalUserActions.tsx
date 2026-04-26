"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { promoteUserAction } from "@/app/_actions/promote-user";
import { demoteUserAction } from "@/app/_actions/demote-user";
import { forceLogoutAction } from "@/app/_actions/force-logout";

type Props = {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
};

type Mode =
  | { kind: "none" }
  | { kind: "promote" }
  | { kind: "demote" }
  | { kind: "force-logout" };

export function GlobalUserActions({ userId, email, isSuperAdmin }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [, startTransition] = useTransition();

  const close = () => setMode({ kind: "none" });

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

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4 mb-6">
      <h2 className="font-display font-semibold text-lg">Ações</h2>
      <div className="flex flex-wrap gap-2">
        {!isSuperAdmin && (
          <button
            type="button"
            onClick={() => setMode({ kind: "promote" })}
            className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
          >
            Promover a super-admin
          </button>
        )}
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setMode({ kind: "demote" })}
            className="rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
          >
            Rebaixar
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode({ kind: "force-logout" })}
          className="rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
        >
          Forçar logout
        </button>
      </div>

      <ConfirmDialog
        open={mode.kind === "promote"}
        title={`Promover ${email}`}
        description="Esta conta passará a ter acesso total como super-admin."
        confirmLabel="Promover"
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(promoteUserAction({ userId, reason }), "Promovido com sucesso")
        }
      />

      <ConfirmDialog
        open={mode.kind === "demote"}
        title={`Rebaixar ${email}`}
        description="Esta conta perderá privilégios de super-admin imediatamente."
        confirmLabel="Rebaixar"
        destructive
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(demoteUserAction({ userId, reason }), "Rebaixado com sucesso")
        }
      />

      <ConfirmDialog
        open={mode.kind === "force-logout"}
        title={`Forçar logout de ${email}`}
        description="Todas as sessões ativas serão revogadas. O usuário precisará logar novamente."
        confirmLabel="Forçar logout"
        destructive
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(forceLogoutAction({ userId, reason }), "Sessões revogadas")
        }
      />
    </div>
  );
}
