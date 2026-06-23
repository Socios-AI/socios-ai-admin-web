"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrgAction } from "@/app/_actions/update-org";

export function OrgEditDialog({ orgId, initialName }: { orgId: string; initialName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setName(initialName); setError(null); setOpen(true); }}
        className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted"
      >
        Editar
      </button>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateOrgAction({ orgId, name });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.message ?? res.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        minLength={2}
        maxLength={200}
        className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        autoFocus
      />
      <button type="button" onClick={save} disabled={pending}
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {pending ? "..." : "Salvar"}
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
        Cancelar
      </button>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  );
}
