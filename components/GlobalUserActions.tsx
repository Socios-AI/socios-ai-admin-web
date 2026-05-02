"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PlatformTier } from "@/lib/data";
import { ConfirmDialog } from "./ConfirmDialog";
import { forceLogoutAction } from "@/app/_actions/force-logout";
import { deleteUserAction } from "@/app/_actions/delete-user";
import { resetUserMfaAction } from "@/app/_actions/reset-user-mfa";
import { promoteToOwnerAction } from "@/app/_actions/promote-to-owner";
import { promoteToAdminAction } from "@/app/_actions/promote-to-admin";
import { demoteOwnerAction } from "@/app/_actions/demote-owner";
import { demoteAdminAction } from "@/app/_actions/demote-admin";

type Props = {
  userId: string;
  email: string;
  tier: PlatformTier | null;
};

type Mode =
  | { kind: "none" }
  | { kind: "force-logout" }
  | { kind: "delete" }
  | { kind: "reset-mfa" }
  | { kind: "promote-owner" }
  | { kind: "promote-admin" }
  | { kind: "demote-owner" }
  | { kind: "demote-admin" };

const TIER_LABEL: Record<PlatformTier, string> = {
  owner: "Owner",
  admin: "Admin",
  affiliate: "Afiliado",
};

function tierLabelOrFallback(tier: PlatformTier | null): string {
  return tier ? TIER_LABEL[tier] : "Sem tier";
}

export function GlobalUserActions({ userId, email, tier }: Props) {
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
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-lg">Ações</h2>
        <span
          className={
            tier
              ? "rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
              : "rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-medium"
          }
        >
          Tier: {tierLabelOrFallback(tier)}
        </span>
      </div>

      {/* Tier management (Plano M.2) · botões condicionais por tier atual */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tier de plataforma
        </p>
        <div className="flex flex-wrap gap-2">
          {tier !== "owner" && (
            <button
              type="button"
              onClick={() => setMode({ kind: "promote-owner" })}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
            >
              Promover a Owner
            </button>
          )}
          {tier === null && (
            <button
              type="button"
              onClick={() => setMode({ kind: "promote-admin" })}
              className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
            >
              Promover a Admin
            </button>
          )}
          {tier === "owner" && (
            <button
              type="button"
              onClick={() => setMode({ kind: "demote-owner" })}
              className="rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
            >
              Demover Owner
            </button>
          )}
          {tier === "admin" && (
            <button
              type="button"
              onClick={() => setMode({ kind: "demote-admin" })}
              className="rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
            >
              Demover Admin
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
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

      <ConfirmDialog
        open={mode.kind === "promote-owner"}
        title={`Promover ${email} a Owner`}
        description="Owner é o nível mais alto da plataforma. Pode promover e demover outros owners e admins. Apenas owners podem promover novos owners."
        confirmLabel="Promover a Owner"
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(promoteToOwnerAction({ userId, reason }), "Promovido a Owner")
        }
      />

      <ConfirmDialog
        open={mode.kind === "promote-admin"}
        title={`Promover ${email} a Admin`}
        description="Admin pode operar quase tudo na plataforma (ler e escrever na maioria das áreas). Apenas owners podem promover novos admins."
        confirmLabel="Promover a Admin"
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(promoteToAdminAction({ userId, reason }), "Promovido a Admin")
        }
      />

      <ConfirmDialog
        open={mode.kind === "demote-owner"}
        title={`Demover Owner ${email}`}
        description="Esta conta deixará de ser owner. Se ela for o único owner ativo, a operação será bloqueada para evitar lockout da plataforma."
        confirmLabel="Demover Owner"
        destructive
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(demoteOwnerAction({ userId, reason }), "Owner demovido")
        }
      />

      <ConfirmDialog
        open={mode.kind === "demote-admin"}
        title={`Demover Admin ${email}`}
        description="Esta conta deixará de ser admin imediatamente."
        confirmLabel="Demover Admin"
        destructive
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(demoteAdminAction({ userId, reason }), "Admin demovido")
        }
      />
    </div>
  );
}
