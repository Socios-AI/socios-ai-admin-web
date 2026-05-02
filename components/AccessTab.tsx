"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "./ConfirmDialog";
import { GrantMembershipDialog } from "./GrantMembershipDialog";
import { grantMembershipAction } from "@/app/_actions/grant-membership";
import { revokeMembershipAction } from "@/app/_actions/revoke-membership";
import { forceLogoutAction } from "@/app/_actions/force-logout";

type Membership = {
  id: string;
  app_slug: string;
  role_slug: string;
  org_id: string | null;
  revoked_at: string | null;
};

type App = { slug: string; name: string };

type Props = {
  userId: string;
  memberships: Membership[];
  apps: App[];
};

type Mode =
  | { kind: "none" }
  | { kind: "grant" }
  | { kind: "revoke"; membershipId: string };

const APPLY_NOW_REASON = "Aplicar mudança de acesso";

export function AccessTab({ userId, memberships, apps }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [, startTransition] = useTransition();

  const close = () => setMode({ kind: "none" });

  const activeMemberships = memberships.filter((m) => !m.revoked_at);

  function showApplyNowToast(message: string) {
    toast.success(message, {
      action: {
        label: "Aplicar agora",
        onClick: () => {
          forceLogoutAction({ userId, reason: APPLY_NOW_REASON }).then((res) => {
            if (res.ok) toast.success("Sessões revogadas");
            else toast.error(res.message ?? "Falha ao revogar sessões");
          });
        },
      },
    });
  }

  function handleGrant(input: { appSlug: string; roleSlug: string; orgId?: string }) {
    startTransition(async () => {
      const res = await grantMembershipAction({ userId, ...input });
      if (!res.ok) {
        toast.error(res.message ?? `Falha (${res.error})`);
        return;
      }
      close();
      router.refresh();
      if (res.suggestForceLogout) {
        showApplyNowToast("Membership concedida");
      } else {
        toast.success("Membership concedida");
      }
    });
  }

  function handleRevoke(membershipId: string, reason: string) {
    startTransition(async () => {
      const res = await revokeMembershipAction({ membershipId, reason });
      if (!res.ok) {
        toast.error(res.message ?? `Falha (${res.error})`);
        return;
      }
      close();
      router.refresh();
      if (res.suggestForceLogout) {
        showApplyNowToast("Membership revogada");
      } else {
        toast.success("Membership revogada");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-lg">Memberships ativas</h2>
        <button
          type="button"
          onClick={() => setMode({ kind: "grant" })}
          className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90"
        >
          Conceder acesso
        </button>
      </div>

      {activeMemberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem memberships ativas.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-2 font-medium">App</th>
                <th className="px-4 py-2 font-medium">Papel</th>
                <th className="px-4 py-2 font-medium">Org</th>
                <th className="px-4 py-2 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {activeMemberships.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 font-mono text-xs">{m.app_slug}</td>
                  <td className="px-4 py-2">{m.role_slug}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {m.org_id ?? <span className="italic">sem org</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setMode({ kind: "revoke", membershipId: m.id })}
                      className="rounded-lg border border-destructive/40 text-destructive px-3 py-1 text-xs hover:bg-destructive/10"
                    >
                      Revogar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <GrantMembershipDialog
        open={mode.kind === "grant"}
        apps={apps}
        onCancel={close}
        onSubmit={handleGrant}
      />

      {mode.kind === "revoke" && (
        <ConfirmDialog
          open
          title="Revogar membership"
          description={`Revoga o acesso a ${
            activeMemberships.find((m) => m.id === mode.membershipId)?.app_slug ?? "app"
          }.`}
          confirmLabel="Revogar"
          destructive
          requireReason
          onCancel={close}
          onConfirm={(reason) => handleRevoke(mode.membershipId, reason)}
        />
      )}
    </div>
  );
}
