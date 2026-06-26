"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrgAdminEmailAction } from "@/app/_actions/update-org-admin-email";

export function RegistrarOrgAdminEmailEdit({
  orgId,
  appSlug,
  initialEmail,
}: { orgId: string; appSlug: string; initialEmail: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <span className="flex items-center gap-2">
        {initialEmail || <span className="text-muted-foreground">sem email</span>}
        <button
          type="button"
          onClick={() => { setEmail(initialEmail); setError(null); setEditing(true); }}
          aria-label={`Editar e-mail do admin (${appSlug})`}
          className="text-primary hover:underline text-xs"
        >
          Editar
        </button>
      </span>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateOrgAdminEmailAction({ orgId, appSlug, email });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.message ?? res.error);
      }
    });
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          className="rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
        <button type="button" onClick={save} disabled={pending}
          className="rounded-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {pending ? "..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setEditing(false)}
          className="rounded-lg border border-input px-2 py-1 text-xs hover:bg-muted">
          Cancelar
        </button>
      </span>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
