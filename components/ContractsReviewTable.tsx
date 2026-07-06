"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveAndSendContractAction, rejectContractAction, type ContractRow } from "@/app/_actions/contracts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ContractsReviewTable({ rows }: { rows: ContractRow[] }) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum contrato aguardando revisão.</p>;
  }

  function approve(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const r = await approveAndSendContractAction({ contractId: id });
      if (r.ok) toast.success("Contrato enviado para assinatura.");
      else toast.error(r.message ?? r.error);
      setBusyId(null);
    });
  }

  function reject(id: string) {
    const reason = window.prompt("Motivo da rejeição:");
    if (!reason) return;
    setBusyId(id);
    startTransition(async () => {
      const r = await rejectContractAction({ contractId: id, reason });
      if (r.ok) toast.success("Contrato rejeitado.");
      else toast.error(r.error);
      setBusyId(null);
    });
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex-1">
            <p className="font-medium">{r.fullName}</p>
            <p className="text-xs text-muted-foreground">{r.email}</p>
          </div>
          {r.country ? <Badge variant="muted">{r.country}</Badge> : null}
          {r.previewUrl ? (
            <a href={r.previewUrl} target="_blank" rel="noreferrer" className="text-sm underline">Ver PDF</a>
          ) : (
            <span className="text-xs text-destructive">PDF indisponível</span>
          )}
          <Button size="sm" onClick={() => approve(r.id)} loading={pending && busyId === r.id}>Aprovar e enviar</Button>
          <Button size="sm" variant="outline" onClick={() => reject(r.id)} disabled={pending && busyId === r.id}>Rejeitar</Button>
        </div>
      ))}
    </div>
  );
}
