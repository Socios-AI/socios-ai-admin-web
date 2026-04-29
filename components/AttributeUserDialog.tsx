"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { findUserForAttributionAction } from "@/app/_actions/find-user-for-attribution";
import { attributeReferralAction } from "@/app/_actions/attribute-referral";

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border px-3 py-1 text-sm hover:bg-accent"
      >
        Atribuir cliente
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-[32rem] shadow-lg">
            <h3 className="font-semibold text-lg mb-2">
              Atribuir cliente a este licenciado
            </h3>
            <label className="block text-sm mb-1">Email do cliente</label>
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@exemplo.com"
                className="flex-1 border rounded px-2 py-1"
                disabled={isSearching || isSubmitting}
              />
              <button
                type="button"
                disabled={isSearching || !email.trim()}
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
                className="rounded border px-3 py-1.5 inline-flex items-center gap-2"
              >
                {isSearching && <Loader2 className="h-3 w-3 animate-spin" />}
                Buscar
              </button>
            </div>

            {found && (
              <div className="rounded border p-3 text-sm mb-3">
                <p className="font-medium">{found.email}</p>
                {found.hasReferral ? (
                  <p className="text-destructive text-xs mt-1">
                    Já atribuído a{" "}
                    <span className="font-mono">
                      {found.currentReferral?.partnerLabel}
                    </span>
                    . Use &quot;Transferir&quot; no licenciado de origem.
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmitting}
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
                    className="mt-2 rounded bg-primary text-primary-foreground px-3 py-1 text-sm inline-flex items-center gap-2"
                  >
                    {isSubmitting && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    Confirmar atribuição
                  </button>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive mb-3">{error}</p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded border px-3 py-1.5"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
