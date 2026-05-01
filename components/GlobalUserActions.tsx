"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { promoteUserAction } from "@/app/_actions/promote-user";
import { demoteUserAction } from "@/app/_actions/demote-user";
import { forceLogoutAction } from "@/app/_actions/force-logout";
import { deleteUserAction } from "@/app/_actions/delete-user";
import { resetUserMfaAction } from "@/app/_actions/reset-user-mfa";

type Props = {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
};

type Mode =
  | { kind: "none" }
  | { kind: "promote" }
  | { kind: "demote" }
  | { kind: "force-logout" }
  | { kind: "delete" }
  | { kind: "reset-mfa" };

export function GlobalUserActions({ userId, email, isSuperAdmin }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [, startTransition] = useTransition();
  // startTransition is used both by `handle` and by the inline reset-mfa
  // handler that needs to surface the dynamic count in the success toast.


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
        <button
          type="button"
          onClick={() => setMode({ kind: "reset-mfa" })}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Resetar MFA
        </button>
        <button
          type="button"
          onClick={() => setMode({ kind: "delete" })}
          className="rounded-lg border border-destructive text-destructive px-3 py-1.5 text-sm font-medium hover:bg-destructive/10"
        >
          Remover usuário
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

      <ConfirmDialog
        open={mode.kind === "delete"}
        title={`Remover ${email} permanentemente`}
        description="Ação IRREVERSÍVEL. Conta, sessões, memberships, subscriptions e profile serão apagados. Histórico de auditoria, partner record e referências em outras tabelas serão preservados com o user_id nulificado. Requer MFA recente."
        confirmLabel="Remover permanentemente"
        destructive
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(deleteUserAction({ userId, reason }), "Usuário removido")
        }
      />

      <ConfirmDialog
        open={mode.kind === "reset-mfa"}
        title={`Resetar MFA de ${email}`}
        description="Todos os fatores TOTP do usuário serão apagados. Ele precisará re-cadastrar um autenticador no próximo login. Use isso só em pedido de suporte (autenticador perdido). Requer MFA recente do operador."
        confirmLabel="Resetar MFA"
        requireReason
        onCancel={close}
        onConfirm={(reason) => {
          // Custom handler so the success toast can include the actual
          // factor count returned by the RPC.
          startTransition(async () => {
            const res = await resetUserMfaAction({ userId, reason });
            if (!res.ok) {
              toast.error(res.message ?? `Falha (${res.error})`);
              return;
            }
            toast.success(`MFA resetado · ${res.factorsDeleted} fator(es) apagado(s)`);
            close();
            router.refresh();
          });
        }}
      />
    </div>
  );
}
