"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrgAction } from "@/app/_actions/update-org";

export function RegistrarOrgNameEdit({ orgId, initialName }: { orgId: string; initialName: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <h1 className="font-display font-semibold text-2xl">{initialName}</h1>
        <button
          type="button"
          onClick={() => { setName(initialName); setError(null); setEditing(true); }}
          className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted"
        >
          Editar cadastro
        </button>
      </div>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateOrgAction({ orgId, name });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.message ?? res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="org-name" className="text-sm text-muted-foreground">Nome</label>
      <div className="flex items-center gap-2">
        <input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          maxLength={200}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        <button type="button" onClick={save} disabled={pending}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {pending ? "..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
          Cancelar
        </button>
      </div>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  );
}
