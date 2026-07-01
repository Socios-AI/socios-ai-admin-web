"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PlatformTier } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./ConfirmDialog";
import { forceLogoutAction } from "@/app/_actions/force-logout";
import { deleteUserAction } from "@/app/_actions/delete-user";
import { resetUserMfaAction } from "@/app/_actions/reset-user-mfa";
import { promoteToOwnerAction } from "@/app/_actions/promote-to-owner";
import { promoteToAdminAction } from "@/app/_actions/promote-to-admin";
import { demoteOwnerAction } from "@/app/_actions/demote-owner";
import { demoteAdminAction } from "@/app/_actions/demote-admin";
import { promoteToRegistrarAction } from "@/app/_actions/promote-to-registrar";
import { demoteRegistrarAction } from "@/app/_actions/demote-registrar";

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
  | { kind: "promote-registrar" }
  | { kind: "demote-owner" }
  | { kind: "demote-admin" }
  | { kind: "demote-registrar" };

const TIER_LABEL: Record<PlatformTier, string> = {
  owner: "Owner",
  admin: "Admin",
  affiliate: "Afiliado",
  registrar: "Cadastrador",
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
    <Card className="mb-6">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg">Ações</h2>
          <Badge variant={tier ? "success" : "muted"}>
            Tier: {tierLabelOrFallback(tier)}
          </Badge>
        </div>

        {/* Tier management (Plano M.2) · botões condicionais por tier atual */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tier de plataforma
          </p>
          <div className="flex flex-wrap gap-2">
            {tier !== "owner" && (
              <Button size="sm" onClick={() => setMode({ kind: "promote-owner" })}>
                Promover a Owner
              </Button>
            )}
            {tier === null && (
              <Button size="sm" onClick={() => setMode({ kind: "promote-admin" })}>
                Promover a Admin
              </Button>
            )}
            {tier === null && (
              <Button size="sm" onClick={() => setMode({ kind: "promote-registrar" })}>
                Promover a Cadastrador
              </Button>
            )}
            {tier === "registrar" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setMode({ kind: "demote-registrar" })}
              >
                Demover Cadastrador
              </Button>
            )}
            {tier === "owner" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setMode({ kind: "demote-owner" })}
              >
                Demover Owner
              </Button>
            )}
            {tier === "admin" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setMode({ kind: "demote-admin" })}
              >
                Demover Admin
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ações de conta
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setMode({ kind: "force-logout" })}
            >
              Forçar logout
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMode({ kind: "reset-mfa" })}
            >
              Resetar MFA
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setMode({ kind: "delete" })}
            >
              Remover usuário
            </Button>
          </div>
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
        open={mode.kind === "promote-registrar"}
        title={`Promover ${email} a Cadastrador`}
        description="Cadastrador pode registrar parceiros (licenciado/representante/embaixador) e tenants de cliente no admin, SEM ver dados financeiros nem configurações. Apenas owners podem promover cadastradores."
        confirmLabel="Promover a Cadastrador"
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(promoteToRegistrarAction({ userId, reason }), "Promovido a Cadastrador")
        }
      />

      <ConfirmDialog
        open={mode.kind === "demote-registrar"}
        title={`Demover Cadastrador ${email}`}
        description="Esta conta deixará de ser cadastradora imediatamente e perderá o acesso ao admin."
        confirmLabel="Demover Cadastrador"
        destructive
        requireReason
        onCancel={close}
        onConfirm={(reason) =>
          handle(demoteRegistrarAction({ userId, reason }), "Cadastrador demovido")
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
      </CardContent>
    </Card>
  );
}
