"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { findUserForAttributionAction } from "@/app/_actions/find-user-for-attribution";
import { attributeReferralAction } from "@/app/_actions/attribute-referral";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FoundUser = {
  userId: string;
  email: string;
  hasReferral: boolean;
  currentReferral: { partnerId: string; partnerLabel: string } | null;
};

export function AttributeUserDialog({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<FoundUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  const close = () => {
    setOpen(false);
    setEmail("");
    setFound(null);
    setError(null);
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Atribuir cliente
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Atribuir cliente a este licenciado"
        size="lg"
        dismissible={!isSearching && !isSubmitting}
      >
        <Field label="Email do cliente" htmlFor="attr-user-email">
          <div className="flex gap-2">
            <Input
              id="attr-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
              disabled={isSearching || isSubmitting}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isSearching || !email.trim()}
              loading={isSearching}
              onClick={() => {
                setError(null);
                setFound(null);
                startSearch(async () => {
                  const out = await findUserForAttributionAction(email);
                  if (!out.ok) {
                    setError(out.message ?? out.error);
                  } else if (!out.result) {
                    setError("Usuário não encontrado.");
                  } else {
                    setFound(out.result);
                  }
                });
              }}
            >
              Buscar
            </Button>
          </div>
        </Field>

        {found && (
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="font-medium">{found.email}</p>
            {found.hasReferral ? (
              <p className="mt-1 text-xs text-destructive">
                Já atribuído a{" "}
                <span className="font-mono">{found.currentReferral?.partnerLabel}</span>. Use
                &quot;Transferir&quot; no licenciado de origem.
              </p>
            ) : (
              <Button
                type="button"
                size="sm"
                className="mt-2"
                loading={isSubmitting}
                onClick={() => {
                  setError(null);
                  startSubmit(async () => {
                    const out = await attributeReferralAction({
                      customerUserId: found.userId,
                      sourcePartnerId: partnerId,
                      attributionSource: "admin_assignment",
                    });
                    if (!out.ok) {
                      setError(out.message ?? out.error);
                    } else {
                      close();
                      router.refresh();
                    }
                  });
                }}
              >
                Confirmar atribuição
              </Button>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Fechar
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
