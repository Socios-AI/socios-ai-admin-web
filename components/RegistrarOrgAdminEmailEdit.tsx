"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrgAdminEmailAction } from "@/app/_actions/update-org-admin-email";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
        toast.success("E-mail atualizado");
        router.refresh();
      } else {
        setError(res.message ?? res.error);
      }
    });
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-8 w-auto min-w-[16rem] text-sm"
          autoFocus
        />
        <Button type="button" size="sm" onClick={save} loading={pending}>
          Salvar
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </span>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
