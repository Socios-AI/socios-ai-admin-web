"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
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
        <Button size="sm" onClick={() => setMode({ kind: "grant" })}>
          Conceder acesso
        </Button>
      </div>

      {activeMemberships.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">Sem memberships ativas.</Card>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>App</TH>
              <TH>Papel</TH>
              <TH>Org</TH>
              <TH className="text-right">Ações</TH>
            </TR>
          </THead>
          <TBody>
            {activeMemberships.map((m) => (
              <TR key={m.id}>
                <TD className="font-mono text-xs">{m.app_slug}</TD>
                <TD>{m.role_slug}</TD>
                <TD className="text-muted-foreground">
                  {m.org_id ?? <span className="italic">sem org</span>}
                </TD>
                <TD className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setMode({ kind: "revoke", membershipId: m.id })}
                  >
                    Revogar
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
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
