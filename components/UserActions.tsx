"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { ROLES, roleRequiresOrg } from "@/lib/roles";
import { promoteUserAction } from "@/app/_actions/promote-user";
import { demoteUserAction } from "@/app/_actions/demote-user";
import { grantMembershipAction } from "@/app/_actions/grant-membership";
import { revokeMembershipAction } from "@/app/_actions/revoke-membership";
import { forceLogoutAction } from "@/app/_actions/force-logout";

type Membership = { id: string; app_slug: string; role_slug: string; revoked_at: string | null };

type Props = {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  memberships: Membership[];
  apps: Array<{ slug: string; name: string }>;
};

type Mode =
  | { kind: "none" }
  | { kind: "promote" }
  | { kind: "demote" }
  | { kind: "force-logout" }
  | { kind: "grant" }
  | { kind: "revoke"; membershipId: string };

export function UserActions({ userId, email, isSuperAdmin, memberships, apps }: Props) {
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

  // grant membership state lives outside the dialog body so it survives re-renders
  const [grantApp, setGrantApp] = useState(apps[0]?.slug ?? "");
  const [grantRole, setGrantRole] = useState<string>("end-user");
  const [grantOrgId, setGrantOrgId] = useState("");

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
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
          onClick={() => setMode({ kind: "grant" })}
          className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted"
        >
          Conceder membership
        </button>
        <button
          type="button"
          onClick={() => setMode({ kind: "force-logout" })}
          className="rounded-lg bg-destructive text-destructive-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
        >
          Forçar logout
        </button>
      </div>

      {memberships.filter((m) => !m.revoked_at).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Revogar membership</p>
          <div className="flex flex-wrap gap-2">
            {memberships
              .filter((m) => !m.revoked_at)
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode({ kind: "revoke", membershipId: m.id })}
                  className="rounded-lg border border-destructive/40 text-destructive px-3 py-1 text-xs hover:bg-destructive/10"
                >
                  Revogar {m.app_slug} / {m.role_slug}
                </button>
              ))}
          </div>
        </div>
      )}

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

      {mode.kind === "revoke" && (
        <ConfirmDialog
          open
          title="Revogar membership"
          description={`Revoga o acesso a ${
            memberships.find((m) => m.id === mode.membershipId)?.app_slug ?? "app"
          }.`}
          confirmLabel="Revogar"
          destructive
          requireReason
          onCancel={close}
          onConfirm={(reason) =>
            handle(
              revokeMembershipAction({ membershipId: mode.membershipId, reason }),
              "Membership revogada",
            )
          }
        />
      )}

      {mode.kind === "grant" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handle(
                grantMembershipAction({
                  userId,
                  appSlug: grantApp,
                  roleSlug: grantRole,
                  orgId: roleRequiresOrg(grantRole) ? grantOrgId : undefined,
                }),
                "Membership concedida",
              );
            }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4"
          >
            <h2 className="font-display font-semibold text-lg">Conceder membership</h2>
            <div className="space-y-1.5">
              <label htmlFor="g-app" className="text-sm font-medium">App</label>
              <select
                id="g-app"
                value={grantApp}
                onChange={(e) => setGrantApp(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {apps.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="g-role" className="text-sm font-medium">Role</label>
              <select
                id="g-role"
                value={grantRole}
                onChange={(e) => setGrantRole(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {ROLES.map((r) => <option key={r.slug} value={r.slug}>{r.label}</option>)}
              </select>
            </div>
            {roleRequiresOrg(grantRole) && (
              <div className="space-y-1.5">
                <label htmlFor="g-org" className="text-sm font-medium">Org ID</label>
                <input
                  id="g-org"
                  type="text"
                  required
                  value={grantOrgId}
                  onChange={(e) => setGrantOrgId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-input px-4 py-2 text-sm hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
              >
                Conceder
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
