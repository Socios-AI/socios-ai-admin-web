"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateMemberNameAction } from "@/app/_actions/update-member-name";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Edita o nome (profiles.full_name) de um membro/dono da org. Usado no detalhe
// do cadastrador para corrigir cadastros sem nome. Gate + firewall na action.
export function RegistrarMemberNameEdit({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <span className="flex items-center gap-2">
        {initialName || <span className="text-muted-foreground">(sem nome)</span>}
        <button
          type="button"
          onClick={() => {
            setName(initialName);
            setError(null);
            setEditing(true);
          }}
          aria-label="Editar nome do responsável"
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
      const res = await updateMemberNameAction({ userId, name });
      if (res.ok) {
        setEditing(false);
        toast.success("Nome atualizado");
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="h-8 w-auto min-w-[14rem] text-sm"
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
