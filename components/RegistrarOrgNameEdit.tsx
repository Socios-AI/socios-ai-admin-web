"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrgAction } from "@/app/_actions/update-org";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RegistrarOrgNameEdit({ orgId, initialName }: { orgId: string; initialName: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <h1 className="font-display font-semibold text-2xl tracking-tight">{initialName}</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => { setName(initialName); setError(null); setEditing(true); }}
        >
          Editar cadastro
        </Button>
      </div>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateOrgAction({ orgId, name });
      if (res.ok) {
        setEditing(false);
        toast.success("Cadastro atualizado");
        router.refresh();
      } else {
        setError(res.message ?? res.error);
      }
    });
  }

  return (
    <Field label="Nome" htmlFor="org-name" error={error ?? undefined} className="max-w-xl">
      <div className="flex items-center gap-2">
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          minLength={2}
          maxLength={200}
          className="text-lg"
          autoFocus
        />
        <Button type="button" onClick={save} loading={pending}>
          Salvar
        </Button>
        <Button type="button" variant="outline" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
    </Field>
  );
}
