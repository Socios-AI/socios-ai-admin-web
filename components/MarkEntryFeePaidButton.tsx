"use client";
import { useState, useTransition } from "react";
import { markEntryFeePaidAction } from "@/app/_actions/mark-entry-fee-paid";

export function MarkEntryFeePaidButton({ partnerId }: { partnerId: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await markEntryFeePaidAction({ partnerId });
            if (!r.ok) setErr(r.message ?? "Erro");
          })
        }
        className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
      >
        Marcar taxa de entrada paga
      </button>
      {err ? <span className="text-sm text-destructive">{err}</span> : null}
    </div>
  );
}
